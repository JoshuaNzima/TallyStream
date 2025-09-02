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

export interface DuplicateItem {
  id: string;
  type: 'constituency' | 'ward' | 'centre';
  existing: any;
  incoming: any;
  isIdentical: boolean;
  parentId?: string; // for wards/centres
}

export interface ImportResult {
  success: number;
  errors: string[];
  duplicates?: DuplicateItem[];
  requiresUserAction?: boolean;
}

export interface ImportOptions {
  handleDuplicates?: 'prompt' | 'update' | 'skip' | 'merge';
  duplicateResolutions?: { [id: string]: 'update' | 'skip' };
}

export class ExcelImporter {
  constructor(private storage: DatabaseStorage) {}

  // Get available sheets from an Excel file
  getAvailableSheets(buffer: Buffer): { name: string; rowCount: number }[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    return workbook.SheetNames.map(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);
      return {
        name: sheetName,
        rowCount: data.length
      };
    });
  }

  // Import from a specific sheet
  async importFromBuffer(buffer: Buffer, sheetName?: string, options: ImportOptions = {}): Promise<ImportResult> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Use specified sheet or default to first sheet
    const targetSheetName = sheetName || workbook.SheetNames[0];
    
    if (!workbook.SheetNames.includes(targetSheetName)) {
      return {
        success: 0,
        errors: [`Sheet "${targetSheetName}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`]
      };
    }
    
    const worksheet = workbook.Sheets[targetSheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    const errors: string[] = [];
    let success = 0;
    const duplicates: DuplicateItem[] = [];

    // Group data by constituency and ward
    const constituencyMap = new Map<string, { name: string; wards: Map<string, { name: string; centres: Array<{ id: string; name: string; voters: number }> }> }>();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const constituencyRaw = this.cleanString(row.Constituency || row.constituency);
        const constituencyName = this.cleanString(row.ConstituencyName || row['Constituency Name'] || row.constituency_name);
        const district = this.cleanString(row.District || row.district || 'Unknown');
        const region = this.cleanString(row.Region || row.region || 'Unknown');
        const wardRaw = this.cleanString(row.Ward || row.ward);
        const wardName = this.cleanString(row.WardName || row['Ward Name'] || row.ward_name);
        const centreRaw = this.cleanString(row.Centre || row.centre || row.Center || row.center);
        const centreName = this.cleanString(row.CentreName || row['Centre Name'] || row.centre_name || row.CenterName || row['Center Name'] || row.center_name);
        const voters = parseInt(row.Voters || row.voters || '0');

        if (!constituencyRaw || !wardRaw || !centreRaw) {
          errors.push(`Row ${i + 2}: Missing required fields (Constituency, Ward, Centre)`);
          continue;
        }

        // Extract IDs and names from the format "107 - LILONGWE CITY"
        const constituencyId = this.extractId(constituencyRaw);
        const wardId = this.extractId(wardRaw);
        const centreId = this.extractId(centreRaw);
        
        const constName = constituencyName || this.extractName(constituencyRaw);
        const wrdName = wardName || this.extractName(wardRaw);
        const centreFinalName = centreName || this.extractName(centreRaw);

        if (!constituencyId || !wardId || !centreId || !centreFinalName) {
          errors.push(`Row ${i + 2}: Invalid format. Use "ID - NAME" format (e.g., "107 - LILONGWE CITY")`);
          continue;
        }

        if (!constituencyMap.has(constituencyId)) {
          constituencyMap.set(constituencyId, { 
            name: constName,
            district: district,
            region: region,
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
          name: centreFinalName,
          voters: voters || 0
        });

      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Invalid data'}`);
      }
    }

    // Check for duplicates if not in batch mode
    if (options.handleDuplicates !== 'update' && options.handleDuplicates !== 'merge') {
      await this.detectDuplicates(constituencyMap, duplicates);
      
      if (duplicates.length > 0 && !options.duplicateResolutions) {
        return {
          success: 0,
          errors,
          duplicates,
          requiresUserAction: true
        };
      }
    }

    // Import data in hierarchical order
    for (const [constituencyId, constituency] of Array.from(constituencyMap.entries())) {
      try {
        // Handle constituency duplicates
        const constDuplicate = duplicates.find(d => d.id === constituencyId && d.type === 'constituency');
        if (constDuplicate && this.shouldSkip(constDuplicate, options)) {
          continue;
        }

        // Create constituency
        await this.storage.upsertConstituency({
          id: constituencyId,
          name: constituency.name,
          code: constituencyId,
          district: constituency.district || 'Unknown',
          state: constituency.region || 'Unknown',
        });

        for (const [wardId, ward] of Array.from(constituency.wards.entries())) {
          // Handle ward duplicates
          const wardDuplicate = duplicates.find(d => d.id === wardId && d.type === 'ward');
          if (wardDuplicate && this.shouldSkip(wardDuplicate, options)) {
            continue;
          }

          // Create ward
          await this.storage.upsertWard({
            id: wardId,
            constituencyId: constituencyId,
            name: ward.name,
            code: wardId,
          });

          for (const centre of ward.centres) {
            // Handle centre duplicates
            const centreDuplicate = duplicates.find(d => d.id === centre.id && d.type === 'centre');
            if (centreDuplicate && this.shouldSkip(centreDuplicate, options)) {
              continue;
            }

            // Create centre
            const createdCentre = await this.storage.upsertCentre({
              id: centre.id,
              wardId: wardId,
              name: centre.name,
              code: centre.id,
              registeredVoters: centre.voters,
            });

            // Create corresponding polling center linked to this centre
            await this.storage.createPollingCenter({
              code: `PC-${centre.id}`,
              name: centre.name,
              constituency: constituency.name,
              district: constituency.district || 'Unknown',
              state: constituency.region || 'Unknown',
              registeredVoters: centre.voters,
              centreId: centre.id,
            });
            success++;
          }
        }
      } catch (error) {
        errors.push(`Error importing ${constituencyId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { 
      success, 
      errors, 
      duplicates: duplicates.length > 0 ? duplicates : undefined,
      requiresUserAction: false 
    };
  }

  private cleanString(value: any): string {
    if (typeof value !== 'string') return String(value || '').trim();
    return value.trim();
  }

  private extractId(idWithName: string): string {
    // Extract ID from format like "107 - LILONGWE CITY" -> "107"
    const parts = idWithName.split(' - ');
    return parts.length > 0 ? parts[0].trim() : idWithName.trim();
  }

  private extractName(idWithName: string): string {
    // Extract name from format like "107 - LILONGWE CITY" -> "LILONGWE CITY"
    const parts = idWithName.split(' - ');
    return parts.length > 1 ? parts.slice(1).join(' - ') : idWithName;
  }

  // Detect duplicates by checking existing data in the database
  private async detectDuplicates(
    constituencyMap: Map<string, { name: string; wards: Map<string, { name: string; centres: Array<{ id: string; name: string; voters: number }> }> }>,
    duplicates: DuplicateItem[]
  ): Promise<void> {
    for (const [constituencyId, constituency] of Array.from(constituencyMap.entries())) {
      // Check constituency duplicates
      const existingConstituency = await this.storage.getConstituency(constituencyId);
      if (existingConstituency) {
        const incoming = {
          id: constituencyId,
          name: constituency.name,
          code: constituencyId,
          district: 'Unknown',
          state: 'Unknown'
        };
        
        const isIdentical = this.compareConstituencyData(existingConstituency, incoming);
        
        duplicates.push({
          id: constituencyId,
          type: 'constituency',
          existing: existingConstituency,
          incoming,
          isIdentical
        });
      }

      // Check ward duplicates
      for (const [wardId, ward] of Array.from(constituency.wards.entries())) {
        const existingWard = await this.storage.getWard(wardId);
        if (existingWard) {
          const incoming = {
            id: wardId,
            constituencyId: constituencyId,
            name: ward.name,
            code: wardId
          };
          
          const isIdentical = this.compareWardData(existingWard, incoming);
          
          duplicates.push({
            id: wardId,
            type: 'ward',
            existing: existingWard,
            incoming,
            isIdentical,
            parentId: constituencyId
          });
        }

        // Check centre duplicates
        for (const centre of ward.centres) {
          const existingCentre = await this.storage.getCentre(centre.id);
          if (existingCentre) {
            const incoming = {
              id: centre.id,
              wardId: wardId,
              name: centre.name,
              code: centre.id,
              registeredVoters: centre.voters
            };
            
            const isIdentical = this.compareCentreData(existingCentre, incoming);
            
            duplicates.push({
              id: centre.id,
              type: 'centre',
              existing: existingCentre,
              incoming,
              isIdentical,
              parentId: wardId
            });
          }
        }
      }
    }
  }

  // Determine if a duplicate should be skipped based on options
  private shouldSkip(duplicate: DuplicateItem, options: ImportOptions): boolean {
    // If it's identical data, always auto-merge (don't skip, let upsert handle it)
    if (duplicate.isIdentical) {
      return false;
    }

    // Check user resolutions
    if (options.duplicateResolutions && options.duplicateResolutions[duplicate.id]) {
      return options.duplicateResolutions[duplicate.id] === 'skip';
    }

    // Check global options
    if (options.handleDuplicates === 'skip') {
      return true;
    }

    return false;
  }

  // Compare constituency data for changes
  private compareConstituencyData(existing: any, incoming: any): boolean {
    return existing.name === incoming.name &&
           existing.code === incoming.code &&
           existing.district === incoming.district &&
           existing.state === incoming.state;
  }

  // Compare ward data for changes
  private compareWardData(existing: any, incoming: any): boolean {
    return existing.name === incoming.name &&
           existing.code === incoming.code &&
           existing.constituencyId === incoming.constituencyId;
  }

  // Compare centre data for changes
  private compareCentreData(existing: any, incoming: any): boolean {
    return existing.name === incoming.name &&
           existing.code === incoming.code &&
           existing.wardId === incoming.wardId &&
           existing.registeredVoters === incoming.registeredVoters;
  }
}