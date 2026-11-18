const nameInput = document.getElementById('nameInput');
const photoInput = document.getElementById('photoInput');
const creatorPassword = document.getElementById('creatorPassword');
const birthdayPassword = document.getElementById('birthdayPassword');
const traitInputs = [1, 2, 3, 4].map(n => document.getElementById(`trait${n}`));
const messageInput = document.getElementById('messageInput');
const senderInput = document.getElementById('senderInput');
const themeInput = document.getElementById('themeInput');
const photoPreview = document.getElementById('photoPreview');
const previewPhotos = document.getElementById('previewPhotos');
const previewName = document.getElementById('previewName');
const generateBtn = document.getElementById('generateBtn');
const statusMessage = document.getElementById('statusMessage');

const fallbackTraits = [
  'Professional overthinker',
  'Always creating drama',
  'Expert at irritating people',
  'A certified troublemaker'
];

nameInput.addEventListener('input', () => {
  previewName.textContent = nameInput.value.trim() || 'Birthday Star';
});

function showSelectedPhotos() {
  const files = Array.from(photoInput.files || []);
  photoPreview.innerHTML = '';
  previewPhotos.innerHTML = '';
  if (files.length > 4) {
    statusMessage.textContent = 'Please select a maximum of 4 photos.';
    photoInput.value = '';
    return;
  }
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      statusMessage.textContent = 'Only image files are allowed.';
      photoInput.value = '';
      photoPreview.innerHTML = '';
      previewPhotos.innerHTML = '';
      return;
    }
    const url = URL.createObjectURL(file);
    for (const container of [photoPreview, previewPhotos]) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Selected photo preview';
      container.appendChild(img);
    }
  }
  statusMessage.textContent = files.length ? `${files.length} photo(s) selected.` : '';
}
photoInput.addEventListener('change', showSelectedPhotos);

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read one of the photos.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('One of the selected files is not a valid image.'));
      image.onload = () => {
        const maxSide = 1000;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let quality = 0.68;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 760000 && quality > 0.4) {
          quality -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > 760000) {
          reject(new Error('A photo is too large even after compression. Please choose a smaller photo.'));
          return;
        }
        resolve(dataUrl);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function getTraits() {
  return traitInputs.map((input, index) => input.value.trim() || fallbackTraits[index]);
}

function showBirthdayLink(slug) {
  const link = new URL('birthday.html', window.location.href);
  link.searchParams.set('slug', slug);
  statusMessage.innerHTML = '';
  const message = document.createElement('span');
  message.textContent = 'Your birthday website is ready! ';
  const anchor = document.createElement('a');
  anchor.href = link.href;
  anchor.textContent = link.href;
  anchor.target = '_blank';
  anchor.rel = 'noopener';
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = 'COPY LINK';
  copyButton.style.marginLeft = '8px';
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(link.href);
      copyButton.textContent = 'COPIED!';
    } catch {
      window.prompt('Copy your birthday link:', link.href);
    }
  });
  statusMessage.append(message, document.createElement('br'), anchor, document.createElement('br'), copyButton);
}

generateBtn.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  const creator = creatorPassword.value;
  const viewPassword = birthdayPassword.value;
  const files = Array.from(photoInput.files || []);

  if (!name) return statusMessage.textContent = 'Please enter the birthday person’s name.';
  if (!creator) return statusMessage.textContent = 'Please enter your creator password.';
  if (viewPassword.length < 8) return statusMessage.textContent = 'The friend viewing password must be at least 8 characters.';
  if (files.length > 4) return statusMessage.textContent = 'Please select a maximum of 4 photos.';
  if (files.some(file => !file.type.startsWith('image/'))) return statusMessage.textContent = 'Only image files are allowed.';

  try {
    generateBtn.disabled = true;
    statusMessage.textContent = 'Preparing your birthday surprise…';
    const photos = [];
    let totalLength = 0;
    for (const file of files) {
      const dataUrl = await compressImage(file);
      totalLength += dataUrl.length;
      if (totalLength > 2800000) throw new Error('Your photos are too large together. Please choose smaller photos.');
      photos.push(dataUrl);
    }

    statusMessage.textContent = 'Saving your birthday website securely…';
    const payload = {
      creatorPassword: creator,
      password: viewPassword,
      name,
      traits: getTraits(),
      message: messageInput.value.trim(),
      sender: senderInput.value.trim() || 'Your Best Friend',
      theme: themeInput.value,
      photos
    };
    const response = await fetch('/api/create-birthday', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Could not create the birthday website.');
    showBirthdayLink(result.slug);
    creatorPassword.value = '';
  } catch (error) {
    statusMessage.textContent = `❌ ${error.message}`;
  } finally {
    generateBtn.disabled = false;
  }
});
