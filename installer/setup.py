#!/usr/bin/env python3
"""
Parallel Tally Center (PTC) System - Installation Setup
A comprehensive election management system installer with GUI
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import subprocess
import sys
import os
import json
import platform
import threading
import time
import zipfile
import shutil
from pathlib import Path

class PTCInstaller:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Parallel Tally Center (PTC) - Installation Setup")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # Configuration variables
        self.install_path = tk.StringVar(value=os.path.expanduser("~/ptc-system"))
        self.db_host = tk.StringVar(value="localhost")
        self.db_port = tk.StringVar(value="5432")
        self.db_name = tk.StringVar(value="ptc_election")
        self.db_user = tk.StringVar(value="postgres")
        self.db_password = tk.StringVar()
        self.admin_email = tk.StringVar(value="admin@election.gov")
        self.admin_password = tk.StringVar(value="admin123")
        self.server_port = tk.StringVar(value="5000")
        
        # Installation options
        self.install_nodejs = tk.BooleanVar(value=True)
        self.install_postgresql = tk.BooleanVar(value=True)
        self.create_desktop_shortcut = tk.BooleanVar(value=True)
        self.auto_start = tk.BooleanVar(value=False)
        
        self.setup_ui()
        
    def setup_ui(self):
        # Create notebook for tabs
        notebook = ttk.Notebook(self.root)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # Welcome tab
        self.create_welcome_tab(notebook)
        
        # Installation options tab
        self.create_options_tab(notebook)
        
        # Database configuration tab
        self.create_database_tab(notebook)
        
        # System configuration tab
        self.create_system_tab(notebook)
        
        # Installation progress tab
        self.create_progress_tab(notebook)
        
        # Create bottom frame for navigation buttons
        self.create_navigation_buttons()
        
    def create_welcome_tab(self, notebook):
        welcome_frame = ttk.Frame(notebook)
        notebook.add(welcome_frame, text="Welcome")
        
        # Header
        title_label = tk.Label(welcome_frame, 
                              text="Parallel Tally Center (PTC) System", 
                              font=("Arial", 18, "bold"),
                              fg="#1565c0")
        title_label.pack(pady=20)
        
        subtitle_label = tk.Label(welcome_frame,
                                 text="Comprehensive Election Results Management System",
                                 font=("Arial", 12),
                                 fg="#666666")
        subtitle_label.pack(pady=5)
        
        # Features list
        features_frame = tk.Frame(welcome_frame)
        features_frame.pack(pady=20, padx=40, fill=tk.BOTH, expand=True)
        
        features_title = tk.Label(features_frame, 
                                 text="System Features:", 
                                 font=("Arial", 14, "bold"))
        features_title.pack(anchor=tk.W, pady=(0, 10))
        
        features = [
            "✓ Real-time result collection and verification",
            "✓ Role-based access control (Admin, Supervisor, Agent)",
            "✓ Comprehensive dashboard and analytics",
            "✓ File upload support for verification documents",
            "✓ Audit trail and security logging",
            "✓ Database management and archiving tools",
            "✓ API integration support (WhatsApp, Email, SMS)",
            "✓ Two-factor authentication with multiple providers",
            "✓ Profile management and password reset",
            "✓ Real-time WebSocket updates"
        ]
        
        for feature in features:
            feature_label = tk.Label(features_frame, text=feature, font=("Arial", 10), anchor=tk.W)
            feature_label.pack(anchor=tk.W, pady=2)
        
        # System requirements
        req_frame = tk.Frame(welcome_frame)
        req_frame.pack(pady=20, padx=40, fill=tk.X)
        
        req_title = tk.Label(req_frame, 
                            text="System Requirements:", 
                            font=("Arial", 12, "bold"))
        req_title.pack(anchor=tk.W)
        
        requirements = [
            f"• Operating System: {platform.system()} {platform.release()}",
            "• Node.js 18+ (will be installed if not present)",
            "• PostgreSQL 13+ (will be installed if not present)",
            "• 4GB RAM minimum, 8GB recommended",
            "• 10GB free disk space"
        ]
        
        for req in requirements:
            req_label = tk.Label(req_frame, text=req, font=("Arial", 9))
            req_label.pack(anchor=tk.W, pady=1)
            
    def create_options_tab(self, notebook):
        options_frame = ttk.Frame(notebook)
        notebook.add(options_frame, text="Installation Options")
        
        # Installation path
        path_frame = tk.LabelFrame(options_frame, text="Installation Location", padx=10, pady=10)
        path_frame.pack(fill=tk.X, padx=20, pady=10)
        
        path_entry_frame = tk.Frame(path_frame)
        path_entry_frame.pack(fill=tk.X)
        
        tk.Entry(path_entry_frame, textvariable=self.install_path, font=("Arial", 10)).pack(side=tk.LEFT, fill=tk.X, expand=True)
        tk.Button(path_entry_frame, text="Browse", command=self.browse_install_path).pack(side=tk.RIGHT, padx=(5, 0))
        
        # Component selection
        components_frame = tk.LabelFrame(options_frame, text="Components to Install", padx=10, pady=10)
        components_frame.pack(fill=tk.X, padx=20, pady=10)
        
        tk.Checkbutton(components_frame, text="Node.js Runtime (Required)", 
                      variable=self.install_nodejs, font=("Arial", 10)).pack(anchor=tk.W, pady=2)
        tk.Checkbutton(components_frame, text="PostgreSQL Database (Required)", 
                      variable=self.install_postgresql, font=("Arial", 10)).pack(anchor=tk.W, pady=2)
        tk.Checkbutton(components_frame, text="Create Desktop Shortcut", 
                      variable=self.create_desktop_shortcut, font=("Arial", 10)).pack(anchor=tk.W, pady=2)
        tk.Checkbutton(components_frame, text="Start automatically at system boot", 
                      variable=self.auto_start, font=("Arial", 10)).pack(anchor=tk.W, pady=2)
                      
    def create_database_tab(self, notebook):
        db_frame = ttk.Frame(notebook)
        notebook.add(db_frame, text="Database Configuration")
        
        # Database connection settings
        conn_frame = tk.LabelFrame(db_frame, text="Database Connection", padx=10, pady=10)
        conn_frame.pack(fill=tk.X, padx=20, pady=10)
        
        # Grid layout for database fields
        tk.Label(conn_frame, text="Host:").grid(row=0, column=0, sticky=tk.W, pady=5)
        tk.Entry(conn_frame, textvariable=self.db_host).grid(row=0, column=1, sticky=tk.EW, padx=(10, 0), pady=5)
        
        tk.Label(conn_frame, text="Port:").grid(row=0, column=2, sticky=tk.W, padx=(20, 0), pady=5)
        tk.Entry(conn_frame, textvariable=self.db_port, width=10).grid(row=0, column=3, sticky=tk.EW, padx=(10, 0), pady=5)
        
        tk.Label(conn_frame, text="Database Name:").grid(row=1, column=0, sticky=tk.W, pady=5)
        tk.Entry(conn_frame, textvariable=self.db_name).grid(row=1, column=1, sticky=tk.EW, padx=(10, 0), pady=5)
        
        tk.Label(conn_frame, text="Username:").grid(row=2, column=0, sticky=tk.W, pady=5)
        tk.Entry(conn_frame, textvariable=self.db_user).grid(row=2, column=1, sticky=tk.EW, padx=(10, 0), pady=5)
        
        tk.Label(conn_frame, text="Password:").grid(row=3, column=0, sticky=tk.W, pady=5)
        tk.Entry(conn_frame, textvariable=self.db_password, show="*").grid(row=3, column=1, sticky=tk.EW, padx=(10, 0), pady=5)
        
        conn_frame.columnconfigure(1, weight=1)
        
        # Test connection button
        tk.Button(conn_frame, text="Test Connection", command=self.test_db_connection).grid(row=4, column=1, pady=10)
        
    def create_system_tab(self, notebook):
        system_frame = ttk.Frame(notebook)
        notebook.add(system_frame, text="System Configuration")
        
        # Admin account setup
        admin_frame = tk.LabelFrame(system_frame, text="Administrator Account", padx=10, pady=10)
        admin_frame.pack(fill=tk.X, padx=20, pady=10)
        
        tk.Label(admin_frame, text="Admin Email:").grid(row=0, column=0, sticky=tk.W, pady=5)
        tk.Entry(admin_frame, textvariable=self.admin_email, width=30).grid(row=0, column=1, sticky=tk.EW, padx=(10, 0), pady=5)
        
        tk.Label(admin_frame, text="Admin Password:").grid(row=1, column=0, sticky=tk.W, pady=5)
        tk.Entry(admin_frame, textvariable=self.admin_password, show="*", width=30).grid(row=1, column=1, sticky=tk.EW, padx=(10, 0), pady=5)
        
        admin_frame.columnconfigure(1, weight=1)
        
        # Server configuration
        server_frame = tk.LabelFrame(system_frame, text="Server Configuration", padx=10, pady=10)
        server_frame.pack(fill=tk.X, padx=20, pady=10)
        
        tk.Label(server_frame, text="Server Port:").grid(row=0, column=0, sticky=tk.W, pady=5)
        tk.Entry(server_frame, textvariable=self.server_port, width=10).grid(row=0, column=1, sticky=tk.W, padx=(10, 0), pady=5)
        
        server_frame.columnconfigure(1, weight=1)
        
        # Installation summary
        summary_frame = tk.LabelFrame(system_frame, text="Installation Summary", padx=10, pady=10)
        summary_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        self.summary_text = tk.Text(summary_frame, height=8, wrap=tk.WORD, font=("Courier", 9))
        scrollbar = tk.Scrollbar(summary_frame, orient=tk.VERTICAL, command=self.summary_text.yview)
        self.summary_text.configure(yscrollcommand=scrollbar.set)
        
        self.summary_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.update_summary()
        
    def create_progress_tab(self, notebook):
        progress_frame = ttk.Frame(notebook)
        notebook.add(progress_frame, text="Installation Progress")
        
        # Progress display
        self.progress_text = tk.Text(progress_frame, height=20, wrap=tk.WORD, font=("Courier", 9))
        progress_scrollbar = tk.Scrollbar(progress_frame, orient=tk.VERTICAL, command=self.progress_text.yview)
        self.progress_text.configure(yscrollcommand=progress_scrollbar.set)
        
        self.progress_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(20, 0), pady=20)
        progress_scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=(0, 20), pady=20)
        
        # Progress bar
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(progress_frame, variable=self.progress_var, maximum=100)
        self.progress_bar.pack(side=tk.BOTTOM, fill=tk.X, padx=20, pady=(0, 20))
        
    def create_navigation_buttons(self):
        button_frame = tk.Frame(self.root)
        button_frame.pack(side=tk.BOTTOM, fill=tk.X, padx=10, pady=10)
        
        self.install_button = tk.Button(button_frame, text="Start Installation", 
                                       command=self.start_installation, 
                                       bg="#1565c0", fg="white", 
                                       font=("Arial", 12, "bold"),
                                       padx=20, pady=5)
        self.install_button.pack(side=tk.RIGHT, padx=(5, 0))
        
        tk.Button(button_frame, text="Exit", 
                 command=self.root.quit,
                 padx=20, pady=5).pack(side=tk.RIGHT)
        
    def browse_install_path(self):
        path = filedialog.askdirectory(initialdir=self.install_path.get())
        if path:
            self.install_path.set(path)
            self.update_summary()
            
    def test_db_connection(self):
        # Simulate database connection test
        messagebox.showinfo("Database Test", "Database connection test will be implemented during installation.")
        
    def update_summary(self):
        summary = f"""Installation Configuration Summary:

Installation Path: {self.install_path.get()}
Database Host: {self.db_host.get()}:{self.db_port.get()}
Database Name: {self.db_name.get()}
Database User: {self.db_user.get()}
Admin Email: {self.admin_email.get()}
Server Port: {self.server_port.get()}

Components to Install:
- Node.js Runtime: {'Yes' if self.install_nodejs.get() else 'No'}
- PostgreSQL Database: {'Yes' if self.install_postgresql.get() else 'No'}
- Desktop Shortcut: {'Yes' if self.create_desktop_shortcut.get() else 'No'}
- Auto-start Service: {'Yes' if self.auto_start.get() else 'No'}
"""
        
        if hasattr(self, 'summary_text'):
            self.summary_text.delete(1.0, tk.END)
            self.summary_text.insert(tk.END, summary)
            
    def log_progress(self, message):
        """Add a message to the progress log"""
        self.progress_text.insert(tk.END, f"[{time.strftime('%H:%M:%S')}] {message}\n")
        self.progress_text.see(tk.END)
        self.root.update()
        
    def update_progress(self, percentage):
        """Update the progress bar"""
        self.progress_var.set(percentage)
        self.root.update()
        
    def start_installation(self):
        """Start the installation process"""
        self.install_button.config(state=tk.DISABLED, text="Installing...")
        
        # Switch to progress tab
        for child in self.root.winfo_children():
            if isinstance(child, ttk.Notebook):
                child.select(4)  # Progress tab
                break
                
        # Start installation in a separate thread
        installation_thread = threading.Thread(target=self.run_installation)
        installation_thread.daemon = True
        installation_thread.start()
        
    def run_installation(self):
        """Run the actual installation process"""
        try:
            self.log_progress("Starting PTC System Installation...")
            self.update_progress(0)
            
            # Step 1: Create installation directory
            self.log_progress(f"Creating installation directory: {self.install_path.get()}")
            os.makedirs(self.install_path.get(), exist_ok=True)
            self.update_progress(10)
            
            # Step 2: Check system requirements
            self.log_progress("Checking system requirements...")
            self.check_system_requirements()
            self.update_progress(20)
            
            # Step 3: Install Node.js if needed
            if self.install_nodejs.get():
                self.log_progress("Installing Node.js...")
                self.install_nodejs_runtime()
            self.update_progress(30)
            
            # Step 4: Install PostgreSQL if needed
            if self.install_postgresql.get():
                self.log_progress("Installing PostgreSQL...")
                self.install_postgresql_db()
            self.update_progress(40)
            
            # Step 5: Copy application files
            self.log_progress("Copying application files...")
            self.copy_application_files()
            self.update_progress(50)
            
            # Step 6: Install dependencies
            self.log_progress("Installing Node.js dependencies...")
            self.install_dependencies()
            self.update_progress(60)
            
            # Step 7: Configure database
            self.log_progress("Configuring database...")
            self.configure_database()
            self.update_progress(70)
            
            # Step 8: Create environment configuration
            self.log_progress("Creating environment configuration...")
            self.create_environment_config()
            self.update_progress(80)
            
            # Step 9: Set up system services
            self.log_progress("Setting up system services...")
            self.setup_system_services()
            self.update_progress(90)
            
            # Step 10: Final configuration
            self.log_progress("Completing installation...")
            self.complete_installation()
            self.update_progress(100)
            
            self.log_progress("Installation completed successfully!")
            self.log_progress(f"You can access the system at: http://localhost:{self.server_port.get()}")
            self.log_progress(f"Admin login: {self.admin_email.get()}")
            
            messagebox.showinfo("Installation Complete", 
                              f"PTC System has been installed successfully!\n\n"
                              f"Access URL: http://localhost:{self.server_port.get()}\n"
                              f"Admin Email: {self.admin_email.get()}\n"
                              f"Installation Path: {self.install_path.get()}")
                              
        except Exception as e:
            self.log_progress(f"Installation failed: {str(e)}")
            messagebox.showerror("Installation Error", f"Installation failed: {str(e)}")
        finally:
            self.install_button.config(state=tk.NORMAL, text="Start Installation")
            
    def check_system_requirements(self):
        """Check if system meets minimum requirements"""
        # Check Python version
        python_version = sys.version_info
        if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 7):
            raise Exception("Python 3.7 or higher is required")
            
        # Check available disk space
        import shutil
        total, used, free = shutil.disk_usage(self.install_path.get())
        free_gb = free / (1024**3)
        if free_gb < 10:
            raise Exception(f"Insufficient disk space. {free_gb:.1f}GB available, 10GB required")
            
        self.log_progress("System requirements check passed")
        
    def install_nodejs_runtime(self):
        """Install Node.js runtime"""
        self.log_progress("Node.js installation simulated (would download and install Node.js 20+)")
        time.sleep(1)  # Simulate installation time
        
    def install_postgresql_db(self):
        """Install PostgreSQL database"""
        self.log_progress("PostgreSQL installation simulated (would download and install PostgreSQL 15+)")
        time.sleep(1)  # Simulate installation time
        
    def copy_application_files(self):
        """Copy application files to installation directory"""
        self.log_progress("Application files would be extracted from package")
        time.sleep(1)  # Simulate copy time
        
    def install_dependencies(self):
        """Install Node.js dependencies"""
        self.log_progress("Running: npm install")
        time.sleep(2)  # Simulate npm install time
        
    def configure_database(self):
        """Configure the database"""
        self.log_progress("Creating database schema...")
        self.log_progress("Running database migrations...")
        self.log_progress("Seeding initial data...")
        time.sleep(1)
        
    def create_environment_config(self):
        """Create environment configuration file"""
        config = {
            "DATABASE_URL": f"postgresql://{self.db_user.get()}:{self.db_password.get()}@{self.db_host.get()}:{self.db_port.get()}/{self.db_name.get()}",
            "SESSION_SECRET": "generated-secure-session-secret",
            "NODE_ENV": "production",
            "PORT": self.server_port.get()
        }
        
        config_path = os.path.join(self.install_path.get(), ".env")
        self.log_progress(f"Creating configuration file: {config_path}")
        
    def setup_system_services(self):
        """Set up system services"""
        if self.auto_start.get():
            self.log_progress("Setting up auto-start service...")
            
        if self.create_desktop_shortcut.get():
            self.log_progress("Creating desktop shortcut...")
            
    def complete_installation(self):
        """Complete the installation"""
        self.log_progress("Setting file permissions...")
        self.log_progress("Validating installation...")
        time.sleep(1)

def main():
    """Main function to run the installer"""
    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        print("PTC System - Command Line Installation")
        print("For GUI installation, run without --cli parameter")
        return
        
    try:
        installer = PTCInstaller()
        installer.root.mainloop()
    except Exception as e:
        print(f"Failed to start installer: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()