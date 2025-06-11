class FacebookPostMonitor {
    constructor() {
        this.isMonitoring = false;
        this.currentData = null;
        this.activeFilter = 'all';
        this.monitoringInterval = null;
        this.pollingInterval = null; // New interval for real-time polling
        this.lastDataHash = null; // To track data changes
        
        this.initializeEventListeners();
        this.loadInitialData();
    }
    
    initializeEventListeners() {
        // Control buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startMonitoring());
        document.getElementById('stop-btn').addEventListener('click', () => this.stopMonitoring());
        
        // Chart filter buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterChart(e.target.dataset.filter));
        });
        
        // Simulate adding scan data (for demo purposes)
        document.addEventListener('keydown', (e) => {
            if (e.key === 's' && e.ctrlKey) {
                e.preventDefault();
                this.simulateScanData();
            }
        });

        // Force refresh with Ctrl+F5
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F5' && e.ctrlKey) {
                e.preventDefault();
                this.forceRefreshUI();
            }
        });
    }
    
    async loadInitialData() {
        try {
            const response = await fetch('/api/data');
            const result = await response.json();
            
            if (result.status === 'success') {
                this.currentData = result.data;
                this.lastDataHash = this.hashData(result.data); // Store initial data hash
                this.updateUI();
                console.log('Initial data loaded:', this.currentData);
            } else {
                throw new Error(result.message || 'Failed to load initial data');
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showStatus('error', 'Lỗi tải dữ liệu ban đầu: ' + error.message);
        }
    }

    // Helper to hash data for comparison
    hashData(data) {
        return JSON.stringify(data); // Simple stringification for comparison
    }

    // Start polling for real-time updates
    startPolling() {
        this.stopPolling(); // Clear any existing polling
        
        // Poll every 10 seconds (adjustable based on needs)
        this.pollingInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/data');
                const result = await response.json();
                
                if (result.status === 'success') {
                    const newDataHash = this.hashData(result.data);
                    if (newDataHash !== this.lastDataHash) {
                        // Only update if data has changed
                        this.currentData = result.data;
                        this.lastDataHash = newDataHash;
                        this.updateUI();
                        console.log('Real-time data updated:', this.currentData);
                        this.showStatus('active', `Cập nhật dữ liệu lúc ${new Date().toLocaleTimeString('vi-VN')}`);
                    }
                } else {
                    throw new Error(result.message || 'Failed to fetch data');
                }
            } catch (error) {
                console.error('Error polling data:', error);
                this.showStatus('error', 'Lỗi cập nhật dữ liệu: ' + error.message);
            }
        }, 10000); // 10-second polling interval
    }

    // Stop polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('Polling stopped');
        }
    }
    
    async startMonitoring() {
        const postUrl = document.getElementById('post-url').value;
        const scanInterval = parseInt(document.getElementById('scan-interval').value);
        const scanUnit = document.getElementById('time-unit').value;
        
        if (!postUrl) {
            alert('Vui lòng nhập URL bài viết Facebook');
            return;
        }
        
        try {
            const response = await fetch('/api/start_monitoring', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    post_url: postUrl,
                    scan_interval: scanInterval,
                    scan_unit: scanUnit
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.isMonitoring = true;
                this.currentData = result.data;
                this.lastDataHash = this.hashData(result.data);
                this.updateUI();
                this.showStatus('active', 'Đang theo dõi - Bắt đầu quét...');
                this.startPolling(); // Start real-time polling
                this.startSimulatedScanning(); // Keep simulation for demo
                console.log('Monitoring started with data:', this.currentData);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error starting monitoring:', error);
            this.showStatus('error', 'Lỗi khởi động theo dõi: ' + error.message);
        }
    }
    
    async stopMonitoring() {
        try {
            const response = await fetch('/api/stop_monitoring', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.isMonitoring = false;
                this.stopPolling(); // Stop real-time polling
                this.stopSimulatedScanning();
                this.showStatus('inactive', 'Đã dừng theo dõi');
                this.updateUI();
                console.log('Monitoring stopped');
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error stopping monitoring:', error);
            this.showStatus('error', 'Lỗi dừng theo dõi: ' + error.message);
        }
    }
    
    startSimulatedScanning() {
        this.stopSimulatedScanning();
        this.monitoringInterval = setInterval(() => {
            this.simulateScanData();
        }, 30000);
    }
    
    stopSimulatedScanning() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    
    async simulateScanData() {
        if (!this.isMonitoring) return;
        
        const lastScan = this.currentData?.scan_history?.slice(-1)[0];
        const baseReactions = lastScan?.total_reactions || 0;
        const baseComments = lastScan?.total_comments || 0;
        const baseShares = lastScan?.total_shares || 0;
        
        const newReactions = baseReactions ;
        const newComments = baseComments + Math.floor(Math.random() * 8);
        const newShares = baseShares + (Math.random() > 0.8 ? 1 : 0);
        
        try {
            const response = await fetch('/api/add_scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reactions: newReactions,
                    comments: newComments,
                    shares: newShares
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                this.currentData = result.data;
                this.lastDataHash = this.hashData(result.data);
                this.updateUI();
                this.showStatus('active', `Đang theo dõi - Lần quét tiếp theo sau ${this.currentData.post_info.scan_interval} ${this.getUnitText()}`);
                console.log('New scan data received:', this.currentData);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error adding scan data:', error);
            this.showStatus('error', 'Lỗi cập nhật dữ liệu: ' + error.message);
        }
    }
    
    getUnitText() {
        const unit = this.currentData?.post_info?.scan_unit || 'minutes';
        const unitMap = {
            'minutes': 'phút',
            'hours': 'giờ'
        };
        return unitMap[unit] || 'phút';
    }
    
    updateUI() {
        console.log('Updating UI with data:', this.currentData);
        this.updateStats();
        this.updateChart();
        this.updateActivityLog();
        this.updateButtons();
        console.log('UI update completed');
    }
    
    updateStats() {
        if (!this.currentData || !this.currentData.scan_history.length) {
            console.log('No data available for stats update');
            return;
        }
        
        const latestScan = this.currentData.scan_history.slice(-1)[0];
        const prevScan = this.currentData.scan_history.slice(-2)[0];
        
        document.getElementById('total-reactions').textContent = this.formatNumber(latestScan.total_reactions);
        document.getElementById('total-comments').textContent = this.formatNumber(latestScan.total_comments);
        document.getElementById('total-shares').textContent = this.formatNumber(latestScan.total_shares);
        document.getElementById('total-scans').textContent = this.currentData.current_stats.total_scans;
        
        if (prevScan) {
            const reactionsChange = latestScan.total_reactions - prevScan.total_reactions;
            const commentsChange = latestScan.total_comments - prevScan.total_comments;
            const sharesChange = latestScan.total_shares - prevScan.total_shares;
            
            document.getElementById('reactions-change').innerHTML = this.formatChange(reactionsChange, '1 quét trước');
            document.getElementById('comments-change').innerHTML = this.formatChange(commentsChange, '1 quét trước');
            document.getElementById('shares-change').innerHTML = this.formatChange(sharesChange, '1 quét trước');
        }
        
        document.getElementById('monitoring-duration').innerHTML = `🕐 ${this.currentData.current_stats.monitoring_duration} theo dõi`;
        console.log('Stats updated with latest scan:', latestScan);
    }
    
    formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    formatChange(change, period) {
        if (change > 0) {
            return `<span class="positive">↗️ +${change} (${period})</span>`;
        } else if (change < 0) {
            return `<span class="negative">↘️ ${change} (${period})</span>`;
        } else {
            return `<span class="neutral">→ Không đổi</span>`;
        }
    }
    
    updateChart() {
        console.log('Updating chart...');
        if (!this.currentData || !this.currentData.scan_history.length) {
            console.log('No data for chart, showing placeholder');
            this.showChartPlaceholder();
            return;
        }
        
        try {
            const chartData = this.prepareChartData();
            console.log('Chart data prepared:', chartData);
            this.renderChart(chartData);
            this.updateLegend();
            console.log('Chart updated successfully');
        } catch (error) {
            console.error('Error зафиксирован updating chart:', error);
            this.showChartPlaceholder();
        }
    }
    
    showChartPlaceholder() {
        const chartSvg = document.getElementById('chart-svg');
        chartSvg.innerHTML = `
            <g transform="translate(400,175)">
                <text text-anchor="middle" class="chart-label" style="font-size: 16px;">
                    Chưa có dữ liệu để hiển thị
                </text>
                <text text-anchor="middle" class="chart-label" y="20" style="font-size: 12px;">
                    Bắt đầu theo dõi để xem biểu đồ
                </text>
            </g>
        `;
    }
    
    prepareChartData() {
        const history = this.currentData.scan_history;
        const timestamps = history.map(scan => scan.time_display);
        const reactions = history.map(scan => scan.total_reactions);
        const comments = history.map(scan => scan.total_comments);
        const shares = history.map(scan => scan.total_shares);
        
        return { timestamps, reactions, comments, shares };
    }
    
    renderChart(data) {
        try {
            const svg = document.getElementById('chart-svg');
            if (!svg) {
                throw new Error('Chart SVG element not found');
            }
            
            const width = 800;
            const height = 350;
            const padding = { top: 50, right: 50, bottom: 50, left: 80 };
            
            svg.innerHTML = '';
            
            if (!data.timestamps.length) {
                throw new Error('No data points to render');
            }
            
            const xScale = this.createXScale(data.timestamps.length, padding.left, width - padding.right);
            const yScale = this.createYScale(data, padding.top, height - padding.bottom);
            
            this.drawGrid(svg, xScale, yScale, data.timestamps);
            
            if (this.activeFilter === 'all') {
                this.drawLine(svg, data.reactions, xScale, yScale, 'line-reactions');
                this.drawLine(svg, data.comments, xScale, yScale, 'line-comments');
                this.drawLine(svg, data.shares, xScale, yScale, 'line-shares');
                this.drawDots(svg, data.reactions, xScale, yScale, 'dot-reactions', 'Cảm xúc', data.timestamps);
                this.drawDots(svg, data.comments, xScale, yScale, 'dot-comments', 'Bình luận', data.timestamps);
                this.drawDots(svg, data.shares, xScale, yScale, 'dot-shares', 'Chia sẻ', data.timestamps);
            } else if (this.activeFilter === 'reactions') {
                this.drawLine(svg, data.reactions, xScale, yScale, 'line-reactions');
                this.drawDots(svg, data.reactions, xScale, yScale, 'dot-reactions', 'Cảm xúc', data.timestamps);
            } else if (this.activeFilter === 'comments') {
                this.drawLine(svg, data.comments, xScale, yScale, 'line-comments');
                this.drawDots(svg, data.comments, xScale, yScale, 'dot-comments', 'Bình luận', data.timestamps);
            } else if (this.activeFilter === 'shares') {
                this.drawLine(svg, data.shares, xScale, yScale, 'line-shares');
                this.drawDots(svg, data.shares, xScale, yScale, 'dot-shares', 'Chia sẻ', data.timestamps);
            }
            
            console.log('Chart rendered successfully with filter:', this.activeFilter);
        } catch (error) {
            console.error('Error in renderChart:', error);
            this.showChartPlaceholder();
        }
    }
    
    createXScale(dataLength, left, right) {
        const step = (right - left) / Math.max(dataLength - 1, 1);
        return (index) => left + index * step;
    }
    
    createYScale(data, top, bottom) {
        let allValues = [];
        if (this.activeFilter === 'all') {
            allValues = [...data.reactions, ...data.comments, ...data.shares];
        } else if (this.activeFilter === 'reactions') {
            allValues = data.reactions;
        } else if (this.activeFilter === 'comments') {
            allValues = data.comments;
        } else if (this.activeFilter === 'shares') {
            allValues = data.shares;
        }
        
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const range = max - min || 1;
        const padding = range * 0.1;
        
        return (value) => bottom - ((value - min + padding) / (range + 2 * padding)) * (bottom - top);
    }
    
    drawGrid(svg, xScale, yScale, timestamps) {
        const yAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        yAxis.setAttribute('x1', '80');
        yAxis.setAttribute('y1', '50');
        yAxis.setAttribute('x2', '80');
        yAxis.setAttribute('y2', '300');
        yAxis.setAttribute('class', 'chart-axis');
        svg.appendChild(yAxis);
        
        const xAxis = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        xAxis.setAttribute('x1', '80');
        xAxis.setAttribute('y1', '300');
        xAxis.setAttribute('x2', '750');
        xAxis.setAttribute('y2', '300');
        xAxis.setAttribute('class', 'chart-axis');
        svg.appendChild(xAxis);
        
        timestamps.forEach((time, index) => {
            if (index % 2 === 0) {
                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', xScale(index));
                label.setAttribute('y', '320');
                label.setAttribute('class', 'chart-label');
                label.setAttribute('text-anchor', 'middle');
                label.textContent = time;
                svg.appendChild(label);
            }
        });
    }
    
    drawLine(svg, data, xScale, yScale, className) {
        const points = data.map((value, index) => `${xScale(index)},${yScale(value)}`).join(' ');
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        line.setAttribute('points', points);
        line.setAttribute('class', `chart-line ${className}`);
        svg.appendChild(line);
    }
    
    drawDots(svg, data, xScale, yScale, className, label, timestamps) {
        data.forEach((value, index) => {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', xScale(index));
            dot.setAttribute('cy', yScale(value));
            dot.setAttribute('class', `chart-dot ${className}`);
            
            dot.addEventListener('mouseenter', (e) => {
                this.showTooltip(e, label, timestamps[index], value);
            });
            
            dot.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
            
            svg.appendChild(dot);
        });
    }
    
    showTooltip(event, label, time, value) {
        const tooltip = document.getElementById('tooltip');
        tooltip.innerHTML = `<strong>${label}</strong><br>${time}: ${value.toLocaleString()}`;
        const rect = event.target.getBoundingClientRect();
        const containerRect = document.querySelector('.chart-container').getBoundingClientRect();
        tooltip.style.left = (rect.left - containerRect.left + 10) + 'px';
        tooltip.style.top = (rect.top - containerRect.top - 50) + 'px';
        tooltip.style.opacity = '1';
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        tooltip.style.opacity = '0';
    }
    
    filterChart(filter) {
        this.activeFilter = filter;
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
        this.updateChart();
    }
    
    updateLegend() {
        const legend = document.getElementById('chart-legend');
        legend.innerHTML = '';
        
        if (!this.currentData || !this.currentData.scan_history.length) {
            return;
        }
        
        const latestScan = this.currentData.scan_history.slice(-1)[0];
        
        if (this.activeFilter === 'all') {
            this.addLegendItem(legend, '#1877f2', `Cảm xúc (${this.formatNumber(latestScan.total_reactions)})`);
            this.addLegendItem(legend, '#42A5F5', `Bình luận (${latestScan.total_comments})`);
            this.addLegendItem(legend, '#66BB6A', `Chia sẻ (${latestScan.total_shares})`);
        } else if (this.activeFilter === 'reactions') {
            this.addLegendItem(legend, '#1877f2', `Cảm xúc (${this.formatNumber(latestScan.total_reactions)})`);
        } else if (this.activeFilter === 'comments') {
            this.addLegendItem(legend, '#42A5F5', `Bình luận (${latestScan.total_comments})`);
        } else if (this.activeFilter === 'shares') {
            this.addLegendItem(legend, '#66BB6A', `Chia sẻ (${latestScan.total_shares})`);
        }
    }
    
    addLegendItem(container, color, text) {
        const item = document.createElement('div');
        item.className = 'legend-item';
        const colorBox = document.createElement('div');
        colorBox.className = 'legend-color';
        colorBox.style.background = color;
        const label = document.createElement('span');
        label.textContent = text;
        item.appendChild(colorBox);
        item.appendChild(label);
        container.appendChild(item);
    }
    
    updateActivityLog() {
        if (!this.currentData || !this.currentData.activity_log.length) {
            return;
        }
        
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = '';
        
        this.currentData.activity_log.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            const time = document.createElement('div');
            time.className = 'activity-time';
            time.textContent = activity.time_display;
            const text = document.createElement('div');
            text.className = 'activity-text';
            text.textContent = activity.message;
            item.appendChild(time);
            item.appendChild(text);
            activityList.appendChild(item);
        });
    }
    
    updateButtons() {
        const startBtn = document.getElementById('start-btn');
        const stopBtn = document.getElementById('stop-btn');
        
        if (this.isMonitoring) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
        }
    }
    
    showStatus(type, message) {
        const statusBar = document.getElementById('status-bar');
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.querySelector('.status-indicator');
        
        statusBar.classList.remove('inactive', 'error');
        statusIndicator.classList.remove('inactive', 'error');
        
        if (type !== 'active') {
            statusBar.classList.add(type);
            statusIndicator.classList.add(type);
        }
        
        statusText.innerHTML = `<strong>Trạng thái:</strong> ${message}`;
    }
    
    forceRefreshUI() {
        console.log('Force refreshing UI...');
        this.loadInitialData(); // Reload data and update UI
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.fbMonitor = new FacebookPostMonitor();
    console.log('🔧 Phím tắt hữu ích:');
    console.log('- Ctrl+S: Mô phỏng thêm dữ liệu quét mới');
    console.log('- Ctrl+F5: Force refresh UI');
});

window.simulateData = () => {
    if (window.fbMonitor) {
        window.fbMonitor.simulateScanData();
    }
};

window.toggleMonitoring = () => {
    if (window.fbMonitor) {
        if (window.fbMonitor.isMonitoring) {
            window.fbMonitor.stopMonitoring();
        } else {
            window.fbMonitor.startMonitoring();
        }
    }
};

window.refreshUI = () => {
    if (window.fbMonitor) {
        window.fbMonitor.forceRefreshUI();
    }
};