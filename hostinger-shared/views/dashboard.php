<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PTC Dashboard - Advanced Analytics</title>
    
    <!-- CSS -->
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <!-- Charts -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- OCR Library -->
    <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
    
    <style>
        .ptc-gradient { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .card-hover:hover { transform: translateY(-2px); transition: transform 0.2s ease-in-out; }
        .chart-container { height: 400px; }
        .ocr-progress { display: none; }
        .drop-zone {
            border: 2px dashed #cbd5e0;
            border-radius: 8px;
            transition: all 0.2s ease;
        }
        .drop-zone.dragover {
            border-color: #667eea;
            background-color: #f7fafc;
        }
    </style>
</head>
<body class="bg-gray-100 min-h-screen">
    <!-- Navigation -->
    <nav class="ptc-gradient text-white shadow-lg">
        <div class="container mx-auto px-4">
            <div class="flex justify-between items-center py-4">
                <div class="flex items-center space-x-4">
                    <h1 class="text-xl font-bold">PTC Analytics Dashboard</h1>
                    <span class="text-sm opacity-75" id="user-info">Analytics & OCR</span>
                </div>
                <div class="flex items-center space-x-4">
                    <button onclick="refreshData()" class="hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded">
                        <i class="fas fa-sync-alt mr-2"></i>Refresh
                    </button>
                    <button onclick="exportData()" class="hover:bg-white hover:bg-opacity-20 px-3 py-2 rounded">
                        <i class="fas fa-download mr-2"></i>Export
                    </button>
                </div>
            </div>
        </div>
    </nav>

    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="mb-8">
            <h1 class="text-3xl font-bold text-gray-800">Real-Time Election Analytics</h1>
            <p class="text-gray-600 mt-2">Live monitoring with OCR-powered result verification</p>
        </div>

        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-white rounded-lg shadow p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-600 text-sm">Total Centers</p>
                        <p class="text-2xl font-bold text-blue-600" id="total-centers">-</p>
                    </div>
                    <i class="fas fa-building text-3xl text-blue-600"></i>
                </div>
                <div class="mt-2">
                    <div class="flex items-center">
                        <div class="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div class="bg-blue-600 h-2 rounded-full" id="completion-bar"></div>
                        </div>
                        <span class="text-xs text-gray-600" id="completion-rate">0%</span>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-600 text-sm">Results Received</p>
                        <p class="text-2xl font-bold text-green-600" id="results-received">-</p>
                    </div>
                    <i class="fas fa-chart-line text-3xl text-green-600"></i>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-600 text-sm">Verified Results</p>
                        <p class="text-2xl font-bold text-green-600" id="verified-results">-</p>
                    </div>
                    <i class="fas fa-check-circle text-3xl text-green-600"></i>
                </div>
                <div class="mt-2">
                    <div class="flex items-center">
                        <div class="w-full bg-gray-200 rounded-full h-2 mr-2">
                            <div class="bg-green-600 h-2 rounded-full" id="verification-bar"></div>
                        </div>
                        <span class="text-xs text-gray-600" id="verification-rate">0%</span>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-lg shadow p-6 card-hover">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-gray-600 text-sm">Pending Review</p>
                        <p class="text-2xl font-bold text-yellow-600" id="pending-results">-</p>
                    </div>
                    <i class="fas fa-clock text-3xl text-yellow-600"></i>
                </div>
            </div>
        </div>

        <!-- OCR File Upload Section -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <h2 class="text-xl font-bold mb-4 flex items-center">
                <i class="fas fa-eye mr-2 text-blue-600"></i>
                OCR Document Analysis
            </h2>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- File Upload -->
                <div class="space-y-4">
                    <div class="drop-zone p-8 text-center" id="drop-zone">
                        <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                        <p class="text-gray-600 mb-2">Drag and drop election documents here</p>
                        <p class="text-sm text-gray-500">or click to select files</p>
                        <input type="file" id="file-input" accept="image/*,.pdf" multiple class="hidden">
                        <button onclick="document.getElementById('file-input').click()" 
                                class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            Select Files
                        </button>
                    </div>
                    
                    <div id="file-list" class="space-y-2"></div>
                </div>
                
                <!-- OCR Results -->
                <div class="space-y-4">
                    <h3 class="text-lg font-semibold">Extracted Text</h3>
                    <div class="bg-gray-50 rounded p-4 min-h-32">
                        <pre id="ocr-results" class="text-sm whitespace-pre-wrap">No text extracted yet. Upload an image to begin OCR processing.</pre>
                    </div>
                    
                    <div class="ocr-progress" id="ocr-progress">
                        <div class="bg-blue-100 rounded p-3">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm font-medium text-blue-900">Processing OCR...</span>
                                <span class="text-sm text-blue-700" id="ocr-percentage">0%</span>
                            </div>
                            <div class="w-full bg-blue-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" id="ocr-progress-bar"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Charts Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Submission Trends -->
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                    <i class="fas fa-chart-line mr-2 text-green-600"></i>
                    24-Hour Submission Trends
                </h2>
                <div class="chart-container">
                    <canvas id="trends-chart"></canvas>
                </div>
            </div>

            <!-- Party Performance -->
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-xl font-bold mb-4 flex items-center">
                    <i class="fas fa-chart-pie mr-2 text-purple-600"></i>
                    Party Performance
                </h2>
                <div class="chart-container">
                    <canvas id="party-chart"></canvas>
                </div>
            </div>
        </div>

        <!-- Top Performing Centers -->
        <div class="bg-white rounded-lg shadow p-6 mb-8">
            <h2 class="text-xl font-bold mb-4 flex items-center">
                <i class="fas fa-trophy mr-2 text-yellow-600"></i>
                Top Performing Centers
            </h2>
            <div class="chart-container">
                <canvas id="centers-chart"></canvas>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-4 flex items-center">
                <i class="fas fa-history mr-2 text-gray-600"></i>
                Recent Activity
            </h2>
            <div id="activity-feed" class="space-y-3">
                <!-- Activity items loaded here -->
            </div>
        </div>
    </div>

    <!-- JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script>
        // Dashboard JavaScript
        let trendsChart, partyChart, centersChart;
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            setupFileUpload();
            loadDashboardData();
            setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
        });
        
        // File upload setup
        function setupFileUpload() {
            const dropZone = document.getElementById('drop-zone');
            const fileInput = document.getElementById('file-input');
            
            // Drag and drop
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            
            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                handleFiles(e.dataTransfer.files);
            });
            
            fileInput.addEventListener('change', (e) => {
                handleFiles(e.target.files);
            });
        }
        
        // Handle file upload and OCR
        function handleFiles(files) {
            const fileList = document.getElementById('file-list');
            
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    processImageOCR(file);
                }
            });
        }
        
        async function processImageOCR(file) {
            const progressElement = document.getElementById('ocr-progress');
            const progressBar = document.getElementById('ocr-progress-bar');
            const progressText = document.getElementById('ocr-percentage');
            const resultsElement = document.getElementById('ocr-results');
            
            progressElement.style.display = 'block';
            
            try {
                const result = await Tesseract.recognize(file, 'eng', {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const progress = Math.round(m.progress * 100);
                            progressBar.style.width = progress + '%';
                            progressText.textContent = progress + '%';
                        }
                    }
                });
                
                const extractedText = result.data.text.trim();
                resultsElement.textContent = extractedText || 'No text could be extracted from this image.';
                
                // Try to extract election data patterns
                const electionData = extractElectionData(extractedText);
                if (Object.keys(electionData).length > 0) {
                    resultsElement.textContent += '\n\n=== Extracted Election Data ===\n' + 
                        JSON.stringify(electionData, null, 2);
                }
                
            } catch (error) {
                console.error('OCR Error:', error);
                resultsElement.textContent = 'Error processing image: ' + error.message;
            } finally {
                setTimeout(() => {
                    progressElement.style.display = 'none';
                    progressBar.style.width = '0%';
                    progressText.textContent = '0%';
                }, 2000);
            }
        }
        
        // Extract election-specific data from OCR text
        function extractElectionData(text) {
            const data = {};
            
            // Common patterns for election data
            const patterns = {
                candidate: /candidate\s*[:\-]?\s*([a-zA-Z\s]+)/gi,
                votes: /votes?\s*[:\-]?\s*(\d+)/gi,
                party: /party\s*[:\-]?\s*([a-zA-Z\s]+)/gi,
                total: /total\s*[:\-]?\s*(\d+)/gi
            };
            
            for (const [key, pattern] of Object.entries(patterns)) {
                const matches = text.match(pattern);
                if (matches) {
                    data[key] = matches.map(match => match.replace(pattern, '$1').trim());
                }
            }
            
            return data;
        }
        
        // Load dashboard data
        async function loadDashboardData() {
            try {
                const response = await axios.get('index.php?route=api/dashboard/analytics');
                const data = response.data;
                
                updateStatistics(data.stats);
                updateCharts(data);
                updateActivity(data.recentActivity);
                
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }
        
        // Update statistics cards
        function updateStatistics(stats) {
            document.getElementById('total-centers').textContent = stats.totalCenters || 0;
            document.getElementById('results-received').textContent = stats.resultsReceived || 0;
            document.getElementById('verified-results').textContent = stats.verified || 0;
            document.getElementById('pending-results').textContent = stats.pending || 0;
            
            const completionRate = Math.round(stats.completionRate || 0);
            const verificationRate = Math.round(stats.verificationRate || 0);
            
            document.getElementById('completion-rate').textContent = completionRate + '%';
            document.getElementById('verification-rate').textContent = verificationRate + '%';
            document.getElementById('completion-bar').style.width = completionRate + '%';
            document.getElementById('verification-bar').style.width = verificationRate + '%';
        }
        
        // Update charts
        function updateCharts(data) {
            updateTrendsChart(data.submissionTrends || []);
            updatePartyChart(data.partyPerformance || []);
            updateCentersChart(data.topCenters || []);
        }
        
        function updateTrendsChart(trends) {
            const ctx = document.getElementById('trends-chart').getContext('2d');
            
            if (trendsChart) {
                trendsChart.destroy();
            }
            
            trendsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trends.map(t => new Date(t.hour).toLocaleTimeString([], {hour: '2-digit'})),
                    datasets: [{
                        label: 'Submissions',
                        data: trends.map(t => t.submissions),
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'Verifications',
                        data: trends.map(t => t.verifications),
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        function updatePartyChart(parties) {
            const ctx = document.getElementById('party-chart').getContext('2d');
            
            if (partyChart) {
                partyChart.destroy();
            }
            
            partyChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: parties.map(p => p.party),
                    datasets: [{
                        data: parties.map(p => p.presidential_votes || 0),
                        backgroundColor: parties.map(p => p.color || '#8B5CF6')
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        function updateCentersChart(centers) {
            const ctx = document.getElementById('centers-chart').getContext('2d');
            
            if (centersChart) {
                centersChart.destroy();
            }
            
            centersChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: centers.map(c => c.name),
                    datasets: [{
                        label: 'Completion Rate (%)',
                        data: centers.map(c => c.completion_rate),
                        backgroundColor: '#F59E0B',
                        borderColor: '#D97706',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
        
        // Update activity feed
        function updateActivity(activities) {
            const feed = document.getElementById('activity-feed');
            feed.innerHTML = '';
            
            activities.forEach(activity => {
                const item = document.createElement('div');
                item.className = 'flex items-center space-x-3 p-3 bg-gray-50 rounded';
                item.innerHTML = `
                    <i class="fas fa-circle text-xs text-blue-600"></i>
                    <div class="flex-1">
                        <p class="text-sm">${activity.user_name} ${activity.action} ${activity.entity_type}</p>
                        <p class="text-xs text-gray-500">${new Date(activity.created_at).toLocaleString()}</p>
                    </div>
                `;
                feed.appendChild(item);
            });
        }
        
        // Utility functions
        function refreshData() {
            loadDashboardData();
        }
        
        function exportData() {
            // This would implement data export functionality
            alert('Export functionality would be implemented here');
        }
    </script>
</body>
</html>