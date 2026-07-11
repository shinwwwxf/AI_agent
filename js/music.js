/* ===========================================================
   music.js
   負責：提供幾個「上班專注輕音樂 / Lo-fi」頻道，點選後用 YouTube
         iframe 內嵌播放。之後想換成別的頻道，直接改下面的清單即可。
=========================================================== */

const Music = (() => {
  const STATIONS = [
    { id: 'jfKfPfyJRdk', name: 'Lofi Girl 📚 Beats to Relax/Study' },
    { id: '5qap5aO4i9A', name: 'lofi hip hop radio 🌙 24/7 Live' },
    { id: 'wCLyaVWTnV4', name: 'Chillhop Radio ☕ Jazzy Lo-fi Beats' }
  ];

  function init() {
    const picker = document.getElementById('music-picker');
    const wrap = document.getElementById('yt-player-wrap');
    picker.innerHTML = '';

    STATIONS.forEach((station, i) => {
      const chip = document.createElement('button');
      chip.className = 'music-chip' + (i === 0 ? ' active' : '');
      chip.textContent = station.name;
      chip.addEventListener('click', () => {
        picker.querySelectorAll('.music-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        loadStation(station.id, wrap);
      });
      picker.appendChild(chip);
    });

    loadStation(STATIONS[0].id, wrap);
  }

  function loadStation(videoId, wrap) {
    wrap.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0"
        title="YouTube music player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>`;
  }

  return { init };
})();
