from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import datetime, timezone
from backend.data_manager import DataManager
from backend.crawler_post import Monitoring_FB
from datetime import datetime, timedelta
import sqlite3

app = Flask(__name__)
CORS(app)

# Initialize data manager
data_manager = DataManager()
monitoring_fb = Monitoring_FB()

@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    """Get current data from JSON file"""
    try:
        data = data_manager.load_data()
        return jsonify({
            'status': 'success',
            'data': data
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/start_monitoring', methods=['POST'])
def start_monitoring():
    """Start monitoring a Facebook post"""
    try:
        request_data = request.get_json()
        post_url = request_data.get('post_url')
        created_at = datetime.now().isoformat()
        scan_interval = request_data.get('scan_interval', 30)
        scan_unit = request_data.get('scan_unit', 'minutes')
        
        #print(f"[+] Post_Url = {post_url} \n Create_at = {created_at} \n scan_interval ={scan_interval} \n scan_unit = {scan_unit}")
        # Update post info
        #result = data_manager.start_monitoring(post_url, scan_interval, scan_unit)
        result=monitoring_fb.start(post_url=post_url, 
                                   Creat_at=created_at, 
                                   Scan_interval=scan_interval, 
                                   Scan_unit= scan_unit )  # FIX PHÚT và GIỜ
        return jsonify({
            'status': 'success',
            'message': 'Bắt đầu theo dõi bài viết thành công',
            'data': result
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/api/stop_monitoring', methods=['POST'])
def stop_monitoring():
    """Stop monitoring"""
    try:
        monitoring_fb.stop()
        return jsonify({
            'status': 'success',
            'message': 'Đã dừng theo dõi'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

# @app.route('/api/add_scan', methods=['POST'])
# def add_scan():
#     """Add a new scan result (for simulation)"""
#     try:
#         request_data = request.get_json()
#         reactions = request_data.get('reactions', 0)
#         comments = request_data.get('comments', 0)
#         shares = request_data.get('shares', 0)
        
#         new_scan = {
#             "timestamp": datetime.now().isoformat(),
#             "time_display": datetime.now().strftime("%H:%M"),
#             "total_reactions": reactions,
#             "total_comments": comments,
#             "total_shares": shares,
#             "reactions": {
#                 "Like": int(reactions * 0.85),  # Simulate distribution
#                 "Love": int(reactions * 0.08),
#                 "Haha": int(reactions * 0.05),
#                 "Wow": int(reactions * 0.015),
#                 "Sad": int(reactions * 0.003),
#                 "Angry": int(reactions * 0.002)
#             }
#         }
        
#         result = data_manager.add_scan_result(new_scan)
        
#         return jsonify({
#             'status': 'success',
#             'message': 'Đã thêm kết quả quét mới',
#             'data': result
#         })
#     except Exception as e:
#         return jsonify({
#             'status': 'error',
#             'message': str(e)
#         }), 500

@app.route('/api/add_scan', methods=['GET','POST'])
def add_scan():
    """Retrieve the latest scan result"""
    try:
        # Load dữ liệu từ DataManager
        data = data_manager.load_data()
        
        # Kiểm tra xem scan_history có dữ liệu không
        if not data['scan_history']:
            return jsonify({
                'status': 'error',
                'message': 'Không có dữ liệu quét nào được tìm thấy'
            }), 404
        
        # Lấy bản ghi quét mới nhất
        latest_scan = data['scan_history'][-1]
        
        # Đảm bảo tất cả các loại phản ứng đều có mặt, nếu thiếu thì đặt giá trị 0
        full_reactions = {
            "Like": 0,
            "Love": 0,
            "Haha": 0,
            "Wow": 0,
            "Sad": 0,
            "Angry": 0
        }
        full_reactions.update(latest_scan.get('reactions', {}))
        
        # Tạo phản hồi với cấu trúc như yêu cầu
        response_data = {
            "post_url": latest_scan.get('post_url', ''),
            "created_at": latest_scan.get('created_at', datetime.now().isoformat()),
            "scan_interval": latest_scan.get('scan_interval', 0),
            "scan_unit": latest_scan.get('scan_unit', 'Phút'),
            "timestamp": latest_scan.get('timestamp', datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")),
            "time_display": latest_scan.get('time_display', datetime.now(timezone.utc).strftime("%H:%M")),
            "total_reactions": latest_scan.get('total_reactions', 0),
            "total_comments": latest_scan.get('total_comments', 0),
            "total_shares": latest_scan.get('total_shares', 0),
            "reactions": full_reactions
        }
        
        return jsonify({
            'status': 'success',
            'message': 'Đã lấy kết quả quét mới nhất',
            'data': response_data
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f"Lỗi khi lấy dữ liệu quét mới nhất: {str(e)}"
        }), 500

@app.route('/api/chart_data')
def get_chart_data():
    """Get data formatted for charts"""
    try:
        data = data_manager.load_data()
        chart_data = data_manager.format_chart_data(data)
        
        return jsonify({
            'status': 'success',
            'data': chart_data
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Ensure data directory exists
    os.makedirs('data/posts', exist_ok=True)
    os.makedirs('data/logs', exist_ok=True)
    
    app.run(debug=True, host='0.0.0.0', port=5000)