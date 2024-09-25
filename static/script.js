// static/scripts.js
const ROOT = '/data4/lili/data';
// 当前页数，用于加载更多图片
let currentPage = 1;


function setupFileUpload(formId, progressBarId, feedbackId) {
    const form = document.getElementById(formId);
    const progressBar = document.getElementById(progressBarId);
    const feedback = document.getElementById(feedbackId);

    form.addEventListener('submit', function (e) {
        e.preventDefault(); // Prevent form from submitting the default way

        const formData = new FormData(form);
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', function (e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressBar.style.width = percentComplete + '%';
                progressBar.textContent = Math.round(percentComplete) + '%';
            }
        });

        xhr.open('POST', form.action, true);

        xhr.onload = function () {
            const response = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
                feedback.innerHTML = `<p>哇，上传成功耶😄！文件夹路径是: ${response.folder_path}</p>`;
            } else {
                feedback.innerHTML = `<p>失败捏😭，${response.error}</p>`;
            }
        };

        xhr.send(formData);
    });
}



// Initialize both upload forms
setupFileUpload("upload-form", "progress-container", "feedback");
setupFileUpload("upload-form2", "progress-container2", "feedback2");

function joinPaths(...paths) {
    return paths
        .map(path => path.replace(/[/\\]+$/, '')) // 移除每个路径末尾的多余分隔符
        .join('/')
        .replace(/\/{2,}/g, '/'); // 处理多余的分隔符
}

async function browseFolder(folderPath = ROOT) {
    // 先更新路径
    sessionStorage.setItem('currentFolderPath', folderPath);
    // 向服务器发送请求以获取指定文件夹的内容
    const response = await fetch(`/browse_folder?folder_path=${encodeURIComponent(folderPath)}`);
    const data = await response.json();
    
    // 更新当前路径显示
    document.getElementById('current-path').textContent = folderPath;

    const folderList = document.getElementById('folder-list');
    const fileList = document.getElementById('file-list');
    
    folderList.innerHTML = '';
    fileList.innerHTML = '';

    // 遍历服务器返回的文件夹列表，并将它们添加到页面上
    data.folders.forEach(folder => {
        path = joinPaths(folderPath, folder);
        
        const listItem_ = document.createElement('li');
        console.log("Paths: ", path);
        

        const listItem = document.createElement('li');
        listItem.innerHTML = `<a href="#" data-path="${path}">${folder}</a>`;
        folderList.appendChild(listItem);

    });

    data.files.forEach(file => {
        path = joinPaths(folderPath, file);
        const listItem = document.createElement('li');
        listItem.innerHTML = `<a href="#" data-path="${path}">${file}</a>`;
        fileList.appendChild(listItem);
    });


}

document.addEventListener('DOMContentLoaded', () => {
    const savedFolderPath = sessionStorage.getItem('currentFolderPath');
    if (savedFolderPath) {
        // Load the saved folder path on page load
        browseFolder(savedFolderPath);
    } else {
        // Load the default folder
        browseFolder();
    }
});

async function previewFile(filePath) {
    try {
        const response = await fetch(`/preview_file?folder_path=${encodeURIComponent(filePath)}`);
        //const data = await response.json();
        //console.log("Data received:", data); // 调试输出

        const filePreview = document.getElementById("file-preview");
        filePreview.innerHTML = ''; // 清空之前的预览内容

        const contentType = response.headers.get('Content-Type');
        console.log("contentType: " ,contentType);

        if (contentType.includes('image')) {
            const img = document.createElement('img');
            img.src = `/preview_file?folder_path=${encodeURIComponent(filePath)}`;
            img.style.maxWidth = '100%'; // 自适应宽度
            filePreview.appendChild(img);
        } else if (contentType.includes('text')) {
            const text = await response.text();
            const pre = document.createElement('pre');
            pre.textContent = text;
            filePreview.appendChild(pre);
        } else {
            filePreview.textContent = "这个类型文件没啥好看的呢🙄";
        }
    } catch (error) {
        console.error("Error:",error);
        document.getElementById("file-preview").textContent = "An error occurred while previewing the file.";
    }
}

// 为 folderList 添加事件委托
document.getElementById('folder-list').addEventListener('click', function(event) {
    if (event.target.tagName === 'A') {
        event.preventDefault(); // 阻止默认行为
        const path = event.target.getAttribute('data-path');
        browseFolder(path);
    }
});

document.getElementById('folder-list').addEventListener('contextmenu', function(event) {
    if (event.target.tagName === 'A') {
        event.preventDefault(); // 阻止默认行为
        const path = event.target.getAttribute('data-path');
        showMenu(event.pageX, event.pageY, path); // 显示自定义菜单
    }
});

// 为 fileList 添加事件委托
document.getElementById('file-list').addEventListener('click', function(event) {
    if (event.target.tagName === 'A') {
        event.preventDefault(); // 阻止默认行为
        const path = event.target.getAttribute('data-path');
        console.log("data-path: ", path);
        previewFile(path);
    }
});


document.getElementById('file-list').addEventListener('contextmenu', function(event) {
    if (event.target.tagName === 'A') {
        event.preventDefault(); // 阻止默认行为
        const path = event.target.getAttribute('data-path');
        showMenu(event.pageX, event.pageY, path); // 显示自定义菜单
    } 
});

//菜单逻辑
function showMenu(x, y, path) {
    const menu = document.createElement('div');
    menu.style.position = 'absolute';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.backgroundColor = '#fff';
    menu.style.border = '1px solid #fff';
    menu.style.borderRadius = '3px';
    menu.style.padding = '10px';
    menu.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.2)';
    const downloadOption = document.createElement('div');
    downloadOption.textContent = 'Download';
    downloadOption.style.cursor = 'pointer';
    downloadOption.className = 'option';
    downloadOption.addEventListener('click', () => {
        window.location.href = `/download_folder/${path}`;
        document.body.removeChild(menu);
    });

    const deleteOption = document.createElement('div');
    deleteOption.textContent = 'Delete';
    deleteOption.style.cursor = 'pointer';
    deleteOption.className = 'option';
    deleteOption.addEventListener('click', () => {
        softDeleteFile(path);
        document.body.removeChild(menu);
    });

    const popOption = document.createElement('div');
    popOption.textContent = 'panel';
    popOption.style.cursor = 'pointer';
    popOption.className = 'option';
    popOption.addEventListener('click', () => {
        popUp(path);
        document.body.removeChild(menu);
    });   

    menu.appendChild(popOption);
    menu.appendChild(downloadOption);
    menu.appendChild(deleteOption);
    document.body.appendChild(menu);

    // 点击其他地方时隐藏菜单
    document.addEventListener('click', () => {
        if (menu.parentElement) {
            document.body.removeChild(menu);
        }
    }, { once: true });
};

//option逻辑
//删除逻辑
async function softDeleteFile(filePath) {
    const response = await fetch(`/soft_delete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder_path: filePath })
    });
    if (response.ok) {

        alert("📃文件已删除");
        // Save the current folder path in sessionStorage
        sessionStorage.setItem('currentFolderPath', filePath.substring(0, filePath.lastIndexOf('/')));
        location.reload();  // Refresh the page
    } else {
        alert("删除失败😭.");
    }
}

document.getElementById('back-button').addEventListener('click', () => {
    const currentFolderPath = sessionStorage.getItem('currentFolderPath') || ROOT;
    
    // 获取上一级文件夹路径
    const parentFolderPath = currentFolderPath.substring(0, currentFolderPath.lastIndexOf('/'));
    let newPath = ROOT
    // 如果已经是根目录，就保持在根目录
    if (parentFolderPath != ROOT && parentFolderPath.length > ROOT.length) {
        newPath = parentFolderPath
    }

    console.log("newPath: ",newPath);
    // 保存新路径并重新加载
    sessionStorage.setItem('currentFolderPath', newPath);
    browseFolder(newPath);
});


async function popUp(folderPath) {
    currentPage = 1; // 重置页数

    // 清空旧内容
    const imageGallery = document.getElementById('image-gallery');
    imageGallery.innerHTML = '';   
    
    //加载初内容
    await loadImages(folderPath, currentPage);

    // 显示弹出面板
    const popup = document.getElementById('image-popup');
    popup.style.display = 'block';

    // 监听滚动事件，加载更多图片
    imageGallery.addEventListener('scroll', async function() {
        if (this.scrollTop + this.clientHeight >= this.scrollHeight) {
            currentPage++;
            await loadImages(folderPath, currentPage);
        }
    });
    
    // 为了确保页面不会滚动，可以给整个页面加上样式
    document.body.style.overflowY = 'hidden'; // 禁止页面滚动
}

// 关闭弹出面板
document.querySelector('.close-btn').addEventListener('click', () => {
    const popup = document.getElementById('image-popup');
    popup.style.display = 'none';
    document.body.style.overflowY = 'auto';
});

// 加载图片函数
async function loadImages(folderPath, page) {
    const response = await fetch(`/get_images?folder_path=${folderPath}&page=${page}`);
    const images = await response.json();
    const imageGallery = document.getElementById('image-gallery');
    console.log("loadImages: ", images)
    console.log("loadImages: folderPath:", folderPath)
    images.forEach(image => {
        const imageItem = document.createElement('div');
        imageItem.classList.add('image-item');
        
        const img = document.createElement('img');
        img.src = `/preview_file?folder_path=${encodeURIComponent(image)}`;
        
        const filename = document.createElement('p');
        filename.textContent = image.split('/').pop();
        
        imageItem.appendChild(img);
        imageItem.appendChild(filename);
        imageGallery.appendChild(imageItem);
    });
}



