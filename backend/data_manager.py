import json
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any
import sqlite3


class DataManager:
    def __init__(self, data_file='sample_data.json'): 
        '''gán tên file lưu và trích xuất dữ liệu'''
        self.data_file = data_file
        self.monitoring_active = False        
        
       
    def load_data(self) -> Dict[str, Any]:
        """Load data from JSON file"""
        try:
            with open(self.data_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            # Return default data structure if file doesn't exist
            return self._create_default_data()
        except json.JSONDecodeError:
            raise Exception("Invalid JSON format in data file")
    
    def save_data(self, data: Dict[str, Any]) -> None:
        """Save data to JSON file"""
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def _create_default_data(self) -> Dict[str, Any]:
        """Create default data structure"""
        return {
            "post_info": {
                "post_url": "",
                "created_at": datetime.now().isoformat(),
                "scan_interval": 30,
                "scan_unit": "minutes"
            },
            "scan_history": [],
            "activity_log": [],
            "current_stats": {
                "total_scans": 0,
                "monitoring_duration": "0 phút",
                "average_growth_per_hour": {
                    "reactions": 0,
                    "comments": 0,
                    "shares": 0
                },
                "next_scan_in": "N/A"
            }
        }
    
    def start_monitoring(self, post_url: str, scan_interval, scan_unit) -> Dict[str, Any]:
        """Start monitoring a Facebook post"""
        data = self.load_data()
        
        # Update post info
        data['post_info'].update({
            'post_url': post_url,
            'created_at': datetime.now().isoformat(),
            'scan_interval': scan_interval,
            'scan_unit': scan_unit
        })
        
        # Add start activity log
        self._add_activity_log(data, 'start', '🚀 Bắt đầu theo dõi bài viết')
        
        # Reset stats
        data['current_stats']['total_scans'] = 0
        data['current_stats']['monitoring_duration'] = '0 phút'
        
        self.save_data(data)
        self.monitoring_active = True
        
        return data
    
    def stop_monitoring(self) -> None:
        """Stop monitoring"""
        data = self.load_data()
        self._add_activity_log(data, 'stop', '⏹️ Đã dừng theo dõi')
        self.save_data(data)
        self.monitoring_active = False
        
    
    def add_scan_result(self, Data) -> Dict[str, Any]:
        """Add a new scan result"""
        try:
            data = self.load_data()
            now = datetime.now(timezone.utc)  # Use UTC timezone
            
            # Ensure reactions have all types
            full_reactions = {
                "Like": 0,
                "Love": 0,
                "Haha": 0,
                "Wow": 0,
                "Sad": 0,
                "Angry": 0
            }
            full_reactions.update(Data.get("reactions", {}))
            Data["reactions"] = full_reactions
            
            # Ensure the new scan has a timezone-aware timestamp
            new_scan = Data.copy()  # Create a copy to avoid modifying input
            if 'timestamp' not in new_scan:
                new_scan['timestamp'] = now.isoformat().replace("+00:00", "Z")  # Standard UTC format
            if 'time_display' not in new_scan:
                new_scan['time_display'] = now.strftime("%H:%M")
            
            # Add to scan history
            data['scan_history'].append(new_scan)
            
            # Calculate changes if previous scan exists
            changes = {}
            if len(data['scan_history']) > 1:
                prev_scan = data['scan_history'][-2]
                changes = {
                    'total_reactions': Data['total_reactions'] - prev_scan['total_reactions'],
                    'total_comments': Data['total_comments'] - prev_scan['total_comments'],
                    'total_shares': Data['total_shares'] - prev_scan['total_shares']
                }
            
            # Add activity log
            total_change = sum(changes.values()) if changes else 0
            message = (
                f"✅ Quét thành công - Tổng tương tác: {Data['total_reactions']:,} "
                f"({total_change:+d} so với lần trước)" if changes else 
                f"✅ Quét thành công - Tổng tương tác: {Data['total_reactions']:,}"
            )
            self._add_activity_log(data, 'success', message, changes)
            
            # Update current stats
            self._update_current_stats(data)
            
            self.save_data(data)
            return data
        except Exception as e:
            print(f"[-] Lỗi tại hàm add_scan_result: {e}")
            return data  # Return data even on error to avoid breaking the caller

    def _add_activity_log(self, data: Dict[str, Any], status: str, message: str, changes: Dict[str, int] = None) -> None:
        """Add entry to activity log"""
        now = datetime.now(timezone.utc)  # Use UTC timezone
        log_entry = {
            "timestamp": now.isoformat().replace("+00:00", "Z"),
            "time_display": now.strftime("%H:%M:%S"),
            "status": status,
            "message": message,
            "changes": changes or {}
        }
        
        data['activity_log'].insert(0, log_entry)  # Insert at beginning
        
        # Keep only last 10 entries
        if len(data['activity_log']) > 10:
            data['activity_log'] = data['activity_log'][:10]

    def _update_current_stats(self, data: Dict[str, Any]) -> None:
        """Update current statistics"""
        scan_count = len(data['scan_history'])
        data['current_stats']['total_scans'] = scan_count
        
        if scan_count > 0:
            # Convert timestamps to timezone-aware datetimes
            first_scan = datetime.fromisoformat(data['scan_history'][0]['timestamp'].replace("Z", "+00:00"))
            last_scan = datetime.fromisoformat(data['scan_history'][-1]['timestamp'].replace("Z", "+00:00"))
            duration = last_scan - first_scan
            hours = duration.total_seconds() / 3600
            
            if hours < 1:
                data['current_stats']['monitoring_duration'] = f"{int(duration.total_seconds() / 60)} phút"
            else:
                data['current_stats']['monitoring_duration'] = f"{hours:.1f} giờ"
            
            # Calculate average growth per hour
            if scan_count > 1 and hours > 0:
                first_data = data['scan_history'][0]
                last_data = data['scan_history'][-1]
                
                data['current_stats']['average_growth_per_hour'] = {
                    'reactions': int((last_data['total_reactions'] - first_data['total_reactions']) / hours),
                    'comments': round((last_data['total_comments'] - first_data['total_comments']) / hours, 1),
                    'shares': round((last_data['total_shares'] - first_data['total_shares']) / hours, 1)
                }
        
        # Set next scan time
        scan_interval = data['post_info']['scan_interval']
        data['current_stats']['next_scan_in'] = f"{scan_interval} phút"
        
    def format_chart_data(self, data: Dict[str, Any]) -> Dict[str, List]:
        """Format data for charts"""
        if not data['scan_history']:
            return {
                'timestamps': [],
                'reactions': [],
                'comments': [],
                'shares': []
            }
        
        timestamps = []
        reactions = []
        comments = []
        shares = []
        
        for scan in data['scan_history']:
            timestamps.append(scan['time_display'])
            reactions.append(scan['total_reactions'])
            comments.append(scan['total_comments'])
            shares.append(scan['total_shares'])
        
        return {
            'timestamps': timestamps,
            'reactions': reactions,
            'comments': comments,
            'shares': shares
        }