const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const preview = document.getElementById("preview");
const previewImage = document.getElementById("previewImage");
const gallery = document.getElementById("gallery");
const statusText = document.getElementById("status");

const startCameraButton = document.getElementById("startCamera");
const takePhotoButton = document.getElementById("takePhoto");
const switchCameraButton = document.getElementById("switchCamera");
const uploadPhotoButton = document.getElementById("uploadPhoto");
const retakePhotoButton = document.getElementById("retakePhoto");

let stream = null;
let facingMode = "user";
let photoBlob = null;

function status(message) {
    statusText.textContent = message;
}

async function startCamera() {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        });

        video.srcObject = stream;
        video.style.display = "block";
        document.getElementById("camera-placeholder").style.display = "none";

        startCameraButton.classList.add("hidden");
        takePhotoButton.classList.remove("hidden");
        switchCameraButton.classList.remove("hidden");

        status("Камера готова.");
    } catch (error) {
        console.error(error);
        status("Не удалось открыть камеру. Разреши доступ к камере в браузере.");
    }
}

function takePhoto() {
    if (!stream) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (facingMode === "user") {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
        photoBlob = blob;
        previewImage.src = URL.createObjectURL(blob);
        preview.classList.remove("hidden");
        status("Фото готово. Можно сохранить.");
    }, "image/jpeg", 0.92);
}

async function uploadPhoto() {
    if (!photoBlob) return;

    const formData = new FormData();
    formData.append("file", photoBlob, "photo.jpg");

    uploadPhotoButton.disabled = true;
    status("Загрузка...");

    try {
        const response = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Ошибка загрузки");
        }

        status("✅ Фото сохранено!");
        preview.classList.add("hidden");
        photoBlob = null;
        await loadGallery();
    } catch (error) {
        console.error(error);
        status("❌ " + error.message);
    } finally {
        uploadPhotoButton.disabled = false;
    }
}

function retakePhoto() {
    photoBlob = null;
    preview.classList.add("hidden");
    status("Можно сделать новый снимок.");
}

async function switchCamera() {
    facingMode = facingMode === "user" ? "environment" : "user";
    await startCamera();
}

async function loadGallery() {
    try {
        const response = await fetch("/api/photos");
        const data = await response.json();

        gallery.innerHTML = "";

        if (data.photos.length === 0) {
            gallery.innerHTML = "<p>Пока нет фотографий.</p>";
            return;
        }

        data.photos.forEach(photo => {
            const img = document.createElement("img");
            img.src = photo.url;
            img.alt = "Фотография";
            gallery.appendChild(img);
        });
    } catch (error) {
        console.error(error);
    }
}

startCameraButton.addEventListener("click", startCamera);
takePhotoButton.addEventListener("click", takePhoto);
switchCameraButton.addEventListener("click", switchCamera);
uploadPhotoButton.addEventListener("click", uploadPhoto);
retakePhotoButton.addEventListener("click", retakePhoto);

loadGallery();
