// Facilitator profile form: photo resize, bio word count and group checks.
const form = document.querySelector('.fp-form');
if (form) {
  const MAX_SIDE = 1200;
  const photoInput = form.querySelector('#photo');
  const photoData = form.querySelector('input[name="photo_data"]');
  const preview = form.querySelector('.photo-preview');
  const photoStatus = form.querySelector('.photo-status');

  const setPhotoValidity = () => photoInput.setCustomValidity(photoData.value ? '' : 'Please add your professional photo.');

  // Shrink the photo in the browser so the upload stays small, then keep it as a JPEG data URL.
  photoInput.addEventListener('change', () => {
    const file = photoInput.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      photoData.value = '';
      photoStatus.textContent = 'Please choose a JPG, PNG or WebP image.';
      setPhotoValidity();
      return;
    }
    photoStatus.textContent = 'Preparing your photo…';
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        photoData.value = canvas.toDataURL('image/jpeg', 0.86);
        preview.src = photoData.value;
        preview.hidden = false;
        photoStatus.textContent = 'Photo ready.';
        setPhotoValidity();
      };
      img.onerror = () => {
        photoData.value = '';
        photoStatus.textContent = "We couldn't read that image. Please try a different JPG or PNG.";
        setPhotoValidity();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
  setPhotoValidity();

  // Live word count for the bio.
  const bio = form.querySelector('textarea[data-min-words]');
  const counter = form.querySelector('[data-counter-for="bio"]');
  const min = Number(bio.dataset.minWords);
  const checkBio = () => {
    const words = bio.value.trim().split(/\s+/).filter(Boolean).length;
    counter.textContent = `${words} / ${min} words minimum`;
    counter.classList.toggle('ok', words >= min);
    bio.setCustomValidity(words >= min ? '' : `Please write at least ${min} words (you have ${words}).`);
  };
  bio.addEventListener('input', checkBio);
  checkBio();

  // At least one course; "Other" needs the course name.
  const courseBoxes = [...form.querySelectorAll('input[name="courses"]')];
  const otherWrap = form.querySelector('.other-course');
  const otherInput = otherWrap.querySelector('input');
  const checkCourses = () => {
    const any = courseBoxes.some((b) => b.checked);
    courseBoxes[0].setCustomValidity(any ? '' : 'Please tick at least one course.');
    const other = courseBoxes.find((b) => b.value === 'Other').checked;
    otherWrap.hidden = !other;
    otherInput.required = other;
  };
  courseBoxes.forEach((b) => b.addEventListener('change', checkCourses));
  checkCourses();
}
