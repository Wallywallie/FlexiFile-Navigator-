from flask import Flask, send_file, request, render_template,jsonify,abort
import os
import zipfile
import io
from datetime import datetime
import json
import shutil

app = Flask(__name__)
UPLOAD_FOLDER = '/data4/lili/data/upload'
LORA_FOLDER = '/minimax-3d-rw/Nero/workspace/gen2/webui-XL/stable-diffusion-webui/models/Lora/'
TRASH_DIR = '/data4/lili/trash' 

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        for file in files:
            ziph.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), os.path.join(path, '..')))

# 生成日期文件夹
def create_date_folder():
    date_folder = datetime.now().strftime('%Y-%m-%d')  # 生成以日期命名的文件夹
    full_path = os.path.join(UPLOAD_FOLDER, date_folder)
    if not os.path.exists(full_path):
        os.makedirs(full_path)
    return full_path

# 获取指定文件夹中的所有文件夹和文件
def list_folders_and_files(folder_path):
    download_folders = []
    folders = []
    files = []
    for entry in os.listdir(folder_path):
        full_path = os.path.join(folder_path, entry)
        if os.path.isdir(full_path):
            folders.append(entry)
        else:
            files.append(entry)
    return folders, files


# 删除 __MACOSX 文件夹及其内容
def delete_macosx_folder(path):
    for root, dirs, files in os.walk(path, topdown=False):
        for name in files:
            if '__MACOSX' in root:
                os.remove(os.path.join(root, name))
        for name in dirs:
            if '__MACOSX' in name:
                os.rmdir(os.path.join(root, name))

# 处理文件夹内容请求
@app.route('/browse_folder', methods=['GET'])
def browse_folder():
    folder_path = request.args.get('folder_path', '/data4/lili/data/')
    if not os.path.isdir(folder_path):
        return "Invalid folder path", 400
    folders, files = list_folders_and_files(folder_path)
    return jsonify({
        'folders': folders,
        'files': files
    })

# 显示文件夹列表
@app.route('/')
def index():
    #feedback = request.args.get('feedback')  # 获取反馈信息
    #folders = [d for d in os.listdir(DOWNLOAD_FOLDER) if os.path.isdir(os.path.join(DOWNLOAD_FOLDER, d))]
    return render_template('upload.html')

# 下载选定的文件夹
@app.route('/download_folder/<path:foldername>', methods=['GET'])
def download_folder(foldername):
    #folder_path = foldername #request.args.get('folder_path', '/data4/lili/comfyui/ComfyUI/output/')
    folder_path = os.path.join('/', foldername)
    print(folder_path)
        # 判断路径是否是文件夹
    if os.path.isdir(folder_path):
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipdir(folder_path, zipf)
        memory_file.seek(0)
        return send_file(memory_file, download_name=f'{os.path.basename(foldername)}.zip', as_attachment=True)
    elif os.path.isfile(folder_path):
        # 如果是文件，直接返回文件
        return send_file(
            folder_path,
            as_attachment=True
        )
    else:
        # 如果路径无效，返回404错误
        return "File or directory not found", 404
    
@app.route('/upload_lora', methods=['POST'])
def upload_lora():
    if 'file' not in request.files:
        return json.dumps({'error': '木有这个文件哦～🤡'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return json.dumps({'error': '还木有选择文件捏😈'}), 400

    if file and file.filename.endswith('.safetensors'):
        file_path = os.path.join(LORA_FOLDER, file.filename)
        file.save(file_path)
        return json.dumps({'message': '哇，上传成功耶😄', 'folder_path': file_path}), 200
    return json.dumps({'error': '必须上传.safetensors文件捏😈'}), 400

@app.route('/preview_file', methods=['GET'])
def preview_file():
    file_path = request.args.get('folder_path')
    print("path: ", file_path)
    
    if not file_path or not os.path.exists(file_path):
        return abort(404, description="File not found")
    
    # 根据文件类型返回不同的响应
    if file_path.lower().endswith('.txt'):
        return preview_text_file(file_path)
    elif file_path.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
        
        return preview_image_file(file_path)
    else:
        return jsonify({"error": "Unsupported file type for preview"}), 400

def preview_text_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        return content, 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def preview_image_file(file_path):
    try:
        return send_file(file_path, mimetype='image/jpeg')
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/upload_zip', methods=['POST'])
def upload_zip():
    if 'file' not in request.files:
        return json.dumps({'error': '木有这个文件哦～🤡'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return json.dumps({'error': '还木有选择文件捏😈'}), 400

    if file and file.filename.endswith('.zip'):
        date_folder = create_date_folder()
        file_path = os.path.join(date_folder, file.filename)
        file.save(file_path)

        folder_path = file_path.replace('.zip', '/')

        # 解压文件到指定目录
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(date_folder)
                #delete_macosx_folder(date_folder)
        except zipfile.BadZipFile:
            return json.dumps({'error': '上传的 ZIP 文件损坏了😥'}), 400
        except Exception as e:
            return json.dumps({'error': f'解压缩失败了😟 错误: {str(e)}'}), 400

        finally:
            # 删除上传的 ZIP 文件，无论成功与否都执行
            if os.path.exists(file_path):
                os.remove(file_path)
        return json.dumps({'message': '哇，上传成功耶😄', 'folder_path': folder_path}), 200

    return json.dumps({'error': '选错文件啦，传一个.zip呗😊'}), 400

@app.route('/soft_delete', methods=['POST'])
def soft_delete():
    data = request.get_json()  # Get JSON data from the request body
    file_path = data.get('folder_path')
    print("delete path:", file_path)
    if not os.path.exists(TRASH_DIR):
        os.makedirs(TRASH_DIR)
    # Move the file to the trash directory
    try:
        trash_path = os.path.join(TRASH_DIR, os.path.basename(file_path))
        print("trash_path: ", trash_path)
        shutil.move(file_path, trash_path)
        return jsonify({'message': 'File marked for deletion.'}), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/get_images')
def get_images():
    folder_path = request.args.get('folder_path')
    page = int(request.args.get('page', 1))
    items_per_page = 8  # 每页加载20个图片

    # 获取指定文件夹下的所有图片文件
    image_files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.endswith(('.png', '.jpg', '.jpeg', '.gif'))]
    for i in image_files:
        print("image_files: ", i)

    # 分页处理
    start = (page - 1) * items_per_page
    end = start + items_per_page
    images_to_return = image_files[start:end]

    return jsonify(images_to_return)




if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, threaded=True, debug = False)