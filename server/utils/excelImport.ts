import * as XLSX from 'xlsx';
import { DatabaseStorage } from '../storage';
import { InsertConstituency, InsertWard, InsertCentre } from '@shared/schema';

export interface ImportRow {
  constituency?: string;
  constituencyName?: string;
  ward?: string;
  wardName?: string;
  centre?: string;
  centreName?: string;
  voters?: number;
}

export class ExcelImporter {
  constructor(private storage: DatabaseStorage) {}

  async importFromBuffer(buffer: Buffer): Promise<{ success: number; errors: string[] }> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    const errors: string[] = [];
    let success = 0;

    // Group data by constituency and ward
    const constituencyMap = new Map<string, { name: string; wards: Map<string, { name: string; centres: Array<{ id: string; name: string; voters: number }> }> }>();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const constituencyId = this.cleanString(row.Constituency || row.constituency);
        const constituencyName = this.cleanString(row.ConstituencyName || row['Constituency Name'] || row.constituency_name);
        const wardId = this.cleanString(row.Ward || row.ward);
        const wardName = this.cleanString(row.WardName || row['Ward Name'] || row.ward_name);
        const centreId = this.cleanString(row.Centre || row.centre || row.Center || row.center);
        const centreName = this.cleanString(row.CentreName || row['Centre Name'] || row.centre_name || row.CenterName || row['Center Name'] || row.center_name);
        const voters = parseInt(row.Voters || row.voters || '0');

        if (!constituencyId || !wardId || !centreId || !centreName) {
          errors.push(`Row ${i + 2}: Missing required fields (Constituency, Ward, Centre, Centre Name)`);
          continue;
        }

        // Extract names from the format "107 - LILONGWE CITY"
        const constName = constituencyName || this.extractName(constituencyId);
        const wrdName = wardName || this.extractName(wardId);

        if (!constituencyMap.has(constituencyId)) {
          constituencyMap.set(constituencyId, { 
            name: constName, 
            wards: new Map() 
          });
        }

        const constituency = constituencyMap.get(constituencyId)!;
        if (!constituency.wards.has(wardId)) {
          constituency.wards.set(wardId, { 
            name: wrdName, 
            centres: [] 
          });
        }

        constituency.wards.get(wardId)!.centres.push({
          id: centreId,
          name: centreName,
          voters: voters || 0
        });

      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      }
    }

    // Import data in hierarchical order
    for (const [constituencyId, constituency] of Array.from(constituencyMap.entries())) {
      try {
        // Create constituency
        await this.storage.upsertConstituency({
          id: constituencyId,
          name: constituency.name,
          code: constituencyId,
          district: 'Unknown', // Default - can be updated later
          state: 'Unknown', // Default - can be updated later
        });

        for (const [wardId, ward] of Array.from(constituency.wards.entries())) {
          // Create ward
          await this.storage.upsertWard({
            id: wardId,
            constituencyId: constituencyId,
            name: ward.name,
            code: wardId,
          });

          for (const centre of ward.centres) {
            // Create centre
            await this.storage.upsertCentre({
              id: centre.id,
              wardId: wardId,
              name: centre.name,
              code: centre.id,
              registeredVoters: centre.voters,
            });
            success++;
          }
        }
      } catch (error) {
        errors.push(`Error importing ${constituencyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { success, errors };
  }

  private cleanString(value: any): string {
    if (typeof value !== 'string') return String(value || '').trim();
    return value.trim();
  }

  private extractName(idWithName: string): string {
    // Extract name from format like "107 - LILONGWE CITY" -> "LILONGWE CITY"
    const parts = idWithName.split(' - ');
    return parts.length > 1 ? parts.slice(1).join(' - ') : idWithName;
  }
}