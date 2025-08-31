# WhatsApp and USSD Integration Guide

## Overview

The Parallel Tally Center (PTC) System supports external integration channels for enhanced user interaction and result submission. This document outlines how to set up and utilize WhatsApp and USSD channels for the election management system.

## WhatsApp Integration

### Setup Requirements

1. **Meta Business Account**: Register your organization with Meta Business
2. **WhatsApp Business API**: Apply for WhatsApp Business API access
3. **Webhook URL**: Configure your server to receive WhatsApp messages
4. **Phone Number**: Verify a business phone number with WhatsApp

### Configuration in PTC System

Navigate to **Admin Management → API Settings** to configure WhatsApp integration:

```
WhatsApp Settings:
- Enable WhatsApp: ✓ Enabled
- WhatsApp Token: [Your access token from Meta]
- Phone Number ID: [Your WhatsApp Business phone number ID]
- Webhook Verify Token: [Custom verification token for webhook security]
```

### Supported Features

#### 1. Result Submission via WhatsApp
- Agents can submit preliminary results by sending structured messages
- Format: `RESULT [Polling Center Code] [Category] [Candidate1:Votes] [Candidate2:Votes]`
- Example: `RESULT PC001 PRESIDENT JOHN:1500 JANE:1200`

#### 2. Status Notifications
- Real-time updates on result verification
- Notifications for pending submissions
- System alerts and announcements

#### 3. File Upload Support
- Agents can send photos of result sheets
- Automatic OCR processing for data extraction
- Integration with document verification workflow

### Message Flow

```
1. User sends: "REGISTER"
   → System responds with registration instructions

2. User sends: "STATUS PC001"
   → System responds with polling center status

3. User sends: "RESULT PC001 PRESIDENT JOHN:1500 JANE:1200"
   → System processes and confirms submission

4. User sends: "HELP"
   → System responds with available commands
```

## USSD Integration

The PTC system supports multiple USSD providers simultaneously for redundancy and better network coverage.

### Supported USSD Providers

#### 1. Twilio USSD
- **Global Coverage**: Works worldwide including Malawi
- **Integration Type**: REST API with webhooks
- **Response Format**: Plain text responses
- **Session Timeout**: 600 seconds (10 minutes)

#### 2. TNM (Telekom Networks Malawi)
- **Local Coverage**: Malawi-specific network provider
- **Integration Type**: Direct telco integration
- **Response Format**: CON/END format
- **Session Timeout**: 180 seconds (3 minutes)

#### 3. Airtel USSD
- **Regional Coverage**: Airtel network coverage across Africa
- **Integration Type**: OAuth-based API
- **Response Format**: JSON with structured responses
- **Session Timeout**: 300 seconds (5 minutes)

### Configuration in PTC System

Navigate to **Admin Management → API & Integrations → USSD Integration**:

#### Multiple Provider Setup
```
USSD Integration:
✓ Enable USSD Services

Provider Configurations:
┌─ Twilio USSD                    [✓ Enabled]
│  Account SID: AC...
│  Auth Token: [Hidden]
│  USSD Phone Number: *123#
│  Webhook: /api/ussd/twilio
│
├─ TNM USSD                       [✓ Enabled]
│  API Key: [Hidden]
│  Short Code: 12345
│  Service Code: *123*45#
│  Webhook: /api/ussd/tnm
│
└─ Airtel USSD                    [✓ Enabled]
   Client ID: your_client_id
   Client Secret: [Hidden]
   Short Code: *456#
   Webhook: /api/ussd/airtel
```

### Benefits of Multi-Provider Setup
- **Network Redundancy**: If one provider fails, others continue working
- **Better Coverage**: Different providers may have better coverage in different regions
- **Load Distribution**: Distribute traffic across multiple providers
- **Cost Optimization**: Choose the most cost-effective provider per transaction

### USSD Menu Structure

#### Main Menu
```
Welcome to PTC System
1. Submit Results
2. Check Status
3. Get Help
4. Exit
```

#### Result Submission Flow
```
1. Submit Results
   → Enter Polling Center Code: ____
   → Select Category:
     1. Presidential
     2. Member of Parliament
     3. Councilor
   → Enter Candidate Votes:
     [Candidate Name]: ____
   → Confirm Submission: YES/NO
```

#### Status Check Flow
```
2. Check Status
   → Enter Polling Center Code: ____
   → Status: [Pending/Submitted/Verified]
   → Last Update: [Timestamp]
```

### Technical Implementation

#### Session Management
- Each USSD session maintains user state
- Automatic session cleanup after timeout
- Secure authentication using phone number verification

#### Data Validation
- Real-time validation of polling center codes
- Candidate name verification against registered candidates
- Vote count format validation

#### Error Handling
- Clear error messages for invalid inputs
- Session recovery for interrupted connections
- Automatic retry mechanisms

## Security Considerations

### WhatsApp Security
- End-to-end encryption for all messages
- Webhook signature verification
- Rate limiting to prevent spam
- Phone number verification required

### USSD Security
- Session-based authentication
- Input sanitization and validation
- Secure transmission over telecom networks
- Audit logging for all transactions

## Integration Architecture

### API Endpoints

#### WhatsApp Webhook
```
POST /api/webhooks/whatsapp
Content-Type: application/json

{
  "messages": [{
    "from": "phone_number",
    "text": {
      "body": "message_content"
    },
    "timestamp": "unix_timestamp"
  }]
}
```

#### USSD Session Handler
```
POST /api/ussd/session
Content-Type: application/x-www-form-urlencoded

sessionId=123456&phoneNumber=265123456789&text=user_input
```

### Database Integration

- All WhatsApp and USSD submissions follow the same validation pipeline
- Automatic linking to existing polling center and candidate records
- Real-time synchronization with web interface
- Comprehensive audit trail for all submissions

## Monitoring and Analytics

### Real-time Dashboard
- WhatsApp message volume and response times
- USSD session success rates and drop-off points
- Channel-specific submission statistics
- Error rates and common issues

### Reporting Features
- Daily/weekly channel usage reports
- User adoption metrics by channel
- Submission accuracy comparison across channels
- Performance optimization recommendations

## Best Practices

### WhatsApp
1. Use template messages for consistent formatting
2. Implement message queuing for high-volume scenarios
3. Provide clear command syntax in help messages
4. Set up automated responses for common queries

### USSD
1. Keep menu options concise and clear
2. Implement robust session state management
3. Provide easy navigation (0 for main menu, 00 for exit)
4. Test extensively on different mobile networks

### General
1. Maintain consistent user experience across all channels
2. Implement comprehensive logging for troubleshooting
3. Regular testing and validation of integration endpoints
4. User training and documentation for each channel

## Troubleshooting

### Common WhatsApp Issues
- **Webhook not receiving messages**: Check webhook URL and SSL certificate
- **Message delivery failures**: Verify WhatsApp Business API status
- **Authentication errors**: Validate access tokens and permissions

### Common USSD Issues
- **Session timeouts**: Increase session duration or optimize menu flow
- **Parsing errors**: Validate input format and encoding
- **Network connectivity**: Check telecom provider integration

### Support Contacts
- WhatsApp Technical Support: [Meta Business Support]
- USSD Provider Support: [Telecom Operator Technical Team]
- PTC System Support: [Your IT Support Team]

---

*This integration guide should be reviewed and updated quarterly to ensure compatibility with external service changes and system updates.*