# Parallel Tally Center (PTC) System

## Overview

The Parallel Tally Center (PTC) System is a secure election management platform designed for collecting, verifying, and monitoring election results in real-time. The system enables election agents to submit polling center results with supporting documentation, while supervisors and administrators can verify submissions and monitor the election process through comprehensive dashboards and reporting tools.

The application serves as a critical infrastructure component for election transparency, providing role-based access control, real-time result aggregation, audit trails, and secure file management for election verification documents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Routing**: Wouter for lightweight client-side routing with role-based page access
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Framework**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for consistent styling
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: OpenID Connect integration with Replit Auth for secure user authentication
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **File Uploads**: Multer middleware for handling election verification documents
- **Real-time Communication**: WebSocket server for live dashboard updates and notifications

### Database Design
- **User Management**: Role-based system with agent, supervisor, and admin roles
- **Election Data**: Polling centers, candidates, and results with vote tallies
- **File Management**: Secure storage for result verification documents (images, PDFs)
- **Audit System**: Comprehensive logging of all user actions and system changes
- **Session Storage**: Persistent session management for user authentication state

### Authentication & Authorization
- **Custom Authentication**: Standard login with email/phone and password
- **Role-Based Access**: Three-tier permission system (agent, supervisor, admin)  
- **Password Security**: Bcrypt hashing with salt rounds for secure password storage
- **Session Security**: HTTP-only cookies with secure session storage
- **Route Protection**: Middleware-based access control for API endpoints and frontend routes
- **Auto-seeding**: Automatic creation of default admin account and sample data

### Real-time Features
- **Live Dashboard**: WebSocket-powered real-time updates for election statistics
- **Status Notifications**: Instant updates when results are submitted or verified
- **Multi-user Coordination**: Real-time synchronization across multiple user sessions

## External Dependencies

### Database Services
- **PostgreSQL**: Primary database for all application data with Neon Database as the hosted provider
- **Drizzle ORM**: Type-safe database operations with automatic migration management

### Authentication Services
- **Custom Authentication**: Email/phone + password authentication with bcrypt hashing
- **Connect-PG-Simple**: PostgreSQL session store for persistent user sessions
- **Single Session Enforcement**: Prevents concurrent logins from multiple devices per user

### USSD Integration Services
- **Twilio USSD**: Global USSD service provider for worldwide coverage
- **TNM (Telekom Networks Malawi)**: Local Malawi USSD service integration
- **Airtel USSD**: Regional African network USSD service provider
- **Multi-Provider Support**: Concurrent operation of multiple USSD providers for redundancy

### UI & Styling
- **Shadcn/ui**: Pre-built accessible UI components based on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Headless UI components for accessibility and keyboard navigation
- **Lucide React**: Icon library for consistent iconography

### Development & Build Tools
- **Vite**: Fast build tool with hot module replacement for development
- **TypeScript**: Static type checking for both frontend and backend code
- **ESBuild**: Fast JavaScript bundler for production builds

### File Management
- **Multer**: File upload middleware with support for images and PDF documents
- **File System Storage**: Local file storage for verification documents with size and type validation

### Utility Libraries
- **React Hook Form**: Form management with validation using Zod schemas
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Type-safe CSS class composition
- **React Dropzone**: Drag-and-drop file upload interface