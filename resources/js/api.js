const container = document.getElementById('videos-container');
let paginationWindowStart = 1;
const paginationWindowSize = 5;

function namaChannelText(text) {
  const maxLength = 7;
  return text.length > maxLength ? text.substring(0, maxLength).trim() + '...' : text;
}

function formatWaktuRelatif(publishedAt) {
  const now = new Date();
  const published = new Date(publishedAt);
  const diffMs = now - published;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffHour < 24) {
    return `${diffHour} jam yang lalu`;
  } else if (diffDay < 14) {
    return `${diffDay} hari yang lalu`;
  } else if (diffWeek < 4) {
    return `${diffWeek} minggu yang lalu`;
  } else if (diffMonth < 12) {
    return `${diffMonth} bulan yang lalu`;
  } else {
    return `${diffYear} tahun yang lalu`;
  }
}

function formatViewCount(count) {
  let value, suffix;

  if (count >= 1_000_000_000) {
    value = count / 1_000_000_000;
    suffix = ' M';
  } else if (count >= 1_000_000) {
    value = count / 1_000_000;
    suffix = ' jt';
  } else if (count >= 1_000) {
    value = count / 1_000;
    suffix = ' rb';
  } else {
    return count.toString();
  }

  // Jika < 10, tampilkan 1 angka di belakang koma
  if (value < 10) {
    return value.toFixed(1).replace('.', ',') + suffix;
  } else {
    return Math.floor(value).toString() + suffix;
  }
}

async function fetchChannelImages() {
  const container = document.getElementById('channels');
  const response = await fetch('resources/php/get_channels.php');
  const channels = await response.json();

  channels.forEach(({ id, title, thumbnail }) => {
    const shortName = namaChannelText(title);
    const html = `
      <div class="text-center div-channel py-2">
        <img src="${thumbnail}" class="rounded-circle icon-channel" alt="${title}" data-id="${id}">
        <p class="nama-channel font-h3 lh-sm fw-medium mb-0" data-full="${title}" data-short="${shortName}">${shortName}</p>
      </div>`;
    container.insertAdjacentHTML('beforeend', html);
  });

  setupChannelClickEvents();
}

const pagination = document.getElementById('pagination');
const page = document.getElementById('page');

async function fetchVideos(channelId, page = 1) {
  try {
    const response = await fetch(`resources/php/get_videos.php?channel_id=${channelId}&page=${page}&refreshStats=1`);
    const text = await response.text(); // Ambil mentah dulu
    // console.log('Raw response:', text); // Debug isi respon

    let data;
    try {
      data = JSON.parse(text); // Parse manual biar bisa tangkap error
    } catch (e) {
      throw new Error('Respon bukan JSON valid');
    }

    // Validasi: pastikan data.videos itu array
    if (!Array.isArray(data.videos)) {
      console.error('data.videos bukan array:', data.videos);
      throw new Error('Properti "videos" bukan array');
    }

    container.innerHTML = ''; // Bersihkan kontainer sebelum render ulang

    console.log(data.info); // ✅ tampilkan info di console

    // Render setiap video
    data.videos.forEach(({ id, title, thumbnail_url, duration, channel_thumb, channel_title, published_at, view_count }) => {
      const html = `
        <div class="col">
          <div>
            <div class="position-relative">
              <div class="ratio ratio-16x9 video-trigger" data-bs-toggle="modal" data-bs-target="#videoModal" data-video-id="${id}">
                <img src="${thumbnail_url}" class="w-100 h-100 rounded-3 object-fit-cover" alt="${title}">
              </div>
              <span class="badge position-absolute end-0 me-1 opacity-gabut" style="margin-top: -1.6rem;">${duration}</span>
            </div>
            <div class="card-body pt-2 pb-0 d-flex">
              <img src="${channel_thumb}" class="rounded-circle icons-channel me-2" alt="...">
              <h5 class="card-title font-h4 mb-1">${title}</h5>
            </div>
            <div class="font-h5 m-yt">
              <p class="card-title mb-0">${channel_title}</p>
              <p class="card-title">${formatViewCount(view_count)} x ditonton • ${formatWaktuRelatif(published_at)}</p>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', html);
    });

    // Render pagination kalau fungsi tersedia
    if (typeof renderPagination === 'function') {
      renderPagination(channelId, data.totalPages, data.currentPage);
    }
  } catch (error) {
    console.error('Gagal fetch video:', error.message);
    container.innerHTML = `<p class="error">Gagal memuat video. Coba lagi nanti.</p>`;
  }
}

function renderPagination(channelId, totalPages, currentPage) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';
  page.innerHTML = '';

  // Hitung batas window
  const windowEnd = Math.min(paginationWindowStart + paginationWindowSize - 1, totalPages);

  for (let i = paginationWindowStart; i <= windowEnd; i++) {
    const btn = document.createElement('button');
    btn.className = `btn btn-sm ${i === currentPage ? 'btn-danger' : 'btn-outline-danger'}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      fetchVideos(channelId, i);
    });
    pagination.appendChild(btn);
  }

  // Tombol NEXT WINDOW >
  if (windowEnd < totalPages) {
    const nextWindowBtn = document.createElement('button');
    nextWindowBtn.className = 'btn btn-sm btn-outline-danger';
    nextWindowBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
    nextWindowBtn.addEventListener('click', () => {
      paginationWindowStart++;
      fetchVideos(channelId, paginationWindowStart + paginationWindowSize - 1);
    });
    pagination.appendChild(nextWindowBtn); 
  }

  // Tombol PREV WINDOW <
  if (paginationWindowStart > 1) {
    const prevWindowBtn = document.createElement('button');
    prevWindowBtn.className = 'btn btn-sm btn-outline-danger';
    prevWindowBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
    prevWindowBtn.addEventListener('click', () => {
      paginationWindowStart--;
      fetchVideos(channelId, paginationWindowStart);
    });
    pagination.prepend(prevWindowBtn);
  }

  // Cetak tombol Next hanya jika berada di halaman terakhir
  if (currentPage === totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-sm btn-outline-danger ms-2';
    nextBtn.textContent = 'Next';
    nextBtn.addEventListener('click', () => fetchOlderVideos(channelId));
    page.appendChild(nextBtn);
  }
}

// function baru
async function fetchOlderVideos(channelId) {
  try {
    const response = await fetch(`resources/php/refresh_data.php?channel_id=${channelId}&fetchOlder=1`);
    const result = await response.json();
    console.log('Raw response:', result); // Debug isi respon

    if (result.success) {
      // Ambil ulang video setelah refresh
      fetchVideos(channelId, result.newPage);
    } else {
      console.error('Gagal ambil video lama:', result.message);
    }
  } catch (error) {
    console.error('Error saat fetchOlderVideos:', error.message);
  }
}

document.addEventListener('click', function (e) {
  const trigger = e.target.closest('.video-trigger');
  if (trigger) {
    const videoId = trigger.dataset.videoId;
    const iframe = document.getElementById('videoIframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  }
});

// Bersihkan iframe saat modal ditutup
document.getElementById('videoModal').addEventListener('hidden.bs.modal', function () {
  document.getElementById('videoIframe').src = '';
});

function setupChannelClickEvents() {
  const images = document.querySelectorAll('.icon-channel');

  images.forEach(img => {
    img.addEventListener('click', () => {
      images.forEach(el => el.classList.remove('icon-channel-active'));
      img.classList.add('icon-channel-active');

      const divChannel = document.querySelectorAll('.div-channel');
      divChannel.forEach(div => div.classList.remove('bg-white', 'px-2'));

      const parentDiv = img.closest('.div-channel');
      if (parentDiv) parentDiv.classList.add('bg-white', 'px-2');

      const names = document.querySelectorAll('.nama-channel');
      names.forEach(n => n.textContent = n.dataset.short);

      const nameElement = img.nextElementSibling;
      if (nameElement?.classList.contains('nama-channel')) {
        nameElement.textContent = nameElement.dataset.full;
      }

      const channelId = img.dataset.id;
      fetchVideos(channelId);
    });
  });

  if (images.length > 0) {
    images.forEach(el => el.classList.remove('icon-channel-active'));
    images[0].classList.add('icon-channel-active');

    const names = document.querySelectorAll('.nama-channel');
    names.forEach(n => n.textContent = n.dataset.short);

    const firstName = images[0].nextElementSibling;
    if (firstName?.classList.contains('nama-channel')) {
      firstName.textContent = firstName.dataset.full;
    }

    const parentDiv = images[0].closest('.div-channel');
    if (parentDiv) parentDiv.classList.add('bg-white', 'px-2');

    const defaultChannelId = images[0].dataset.id;
    fetchVideos(defaultChannelId);
  }
}

fetchChannelImages();