/**
 * Frutiger Focus v1.3 - 白噪音/环境音模块
 * 架构：
 *   - 有本地音频文件时：用 <audio> 元素加载（兼容 file:// 和 http://）
 *   - 无本地文件时：fallback 到 Web Audio API 程序化生成
 * 支持格式：mp3, wav, ogg, m4a, webm（自动探测）
 * 支持独立音量控制
 */

const AmbientAudio = (() => {
  let audioCtx = null;
  const activeSounds = {};

  // 支持的音频扩展名（按优先级依次尝试）
  const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'webm'];

  // 8种音效配置（stream: true = 长音频，不需要程序化fallback）
  const SOUNDS = {
    future:  { name: '未来',   icon: '🔮', file: 'future', stream: true },
    rain:    { name: '雨声',   icon: '🌧️', file: 'rain' },
    forest:  { name: '森林',   icon: '🌲', file: 'forest' },
    waves:   { name: '海浪',   icon: '🌊', file: 'waves' },
    river:   { name: '河流',   icon: '🏞️', file: 'river' },
    fire:    { name: '壁炉',   icon: '🔥', file: 'fire' },
    wind:    { name: '微风',   icon: '💨', file: 'wind' },
    piano:   { name: '轻音乐', icon: '🎹', file: 'piano' }
  };

  function init() {
    setupEventListeners();
    restoreState();
  }

  function getAudioContext() {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  // ===== 事件绑定 =====

  function setupEventListeners() {
    document.querySelectorAll('.sound-chip').forEach(card => {
      const soundType = card.dataset.sound;
      if (!soundType || !SOUNDS[soundType]) return;

      const volumeSlider = card.querySelector('.chip-volume');

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip-volume')) return;
        toggleSound(soundType, card);
      });

      volumeSlider.addEventListener('input', (e) => {
        e.stopPropagation();
        const volume = parseInt(e.target.value) / 100;
        if (volume > 0 && !activeSounds[soundType]?.playing) {
          startSound(soundType, card);
        }
        if (volume === 0 && activeSounds[soundType]?.playing) {
          stopSound(soundType, card);
          saveState();
          return;
        }
        setVolume(soundType, volume);
      });

      volumeSlider.addEventListener('change', () => saveState());
    });
  }

  // ===== 播放控制 =====

  function toggleSound(soundType, card) {
    if (activeSounds[soundType]?.playing) {
      stopSound(soundType, card);
      card.querySelector('.chip-volume').value = 0;
    } else {
      startSound(soundType, card);
      card.querySelector('.chip-volume').value = 50;
    }
    saveState();
  }

  async function startSound(soundType, card) {
    if (activeSounds[soundType]?.playing) return;

    const config = SOUNDS[soundType];
    if (!config) return;

    // 第一步：尝试用 <audio> 元素加载本地文件（兼容 file:// 协议）
    const audioUrl = await findAudioFile(config.file);

    if (audioUrl) {
      // 找到了本地文件，用 <audio> + MediaElementSource 播放
      startWithAudioElement(soundType, audioUrl, card);
      return;
    }

    // 第二步：没有本地文件，stream 类型无法 fallback
    if (config.stream) {
      console.warn('[Audio] stream file not found:', config.file);
      return;
    }

    // 第三步：短音频 fallback 到程序化生成
    const ctx = getAudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.5;
    gainNode.connect(ctx.destination);

    const nodes = createProceduralSound(ctx, soundType, gainNode);
    activeSounds[soundType] = { source: null, gainNode, nodes, playing: true, isFile: false };
    card.classList.add('active');
    console.log('[Audio]', soundType, ': procedural');
  }

  // ===== <audio> 元素播放（统一方式，兼容 file:// 和 http://）=====

  function startWithAudioElement(soundType, url, card) {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = 1; // 音量由 GainNode 控制
    audio.preload = 'auto';

    const ctx = getAudioContext();
    const mediaSource = ctx.createMediaElementSource(audio);
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.5;
    mediaSource.connect(gainNode);
    gainNode.connect(ctx.destination);

    audio.play().catch(e => {
      console.warn('[Audio] play failed:', soundType, e.message);
    });

    activeSounds[soundType] = {
      source: null,
      gainNode,
      nodes: [],
      playing: true,
      isFile: true,
      isStream: true,
      audioElement: audio,
      mediaSource
    };

    card.classList.add('active');
    console.log('[Audio]', soundType, ': file', url);
  }

  // ===== 探测本地音频文件 =====
  // 用 <audio> 元素测试 URL 是否可加载（兼容 file:// 协议）

  function findAudioFile(baseName) {
    return new Promise(async (resolve) => {
      for (const ext of AUDIO_EXTENSIONS) {
        const url = `assets/audio/${baseName}.${ext}`;
        const ok = await testAudioUrl(url);
        if (ok) { resolve(url); return; }
      }
      resolve(null);
    });
  }

  function testAudioUrl(url) {
    return new Promise(resolve => {
      const a = new Audio();
      a.preload = 'metadata';
      let settled = false;
      const done = (result) => {
        if (settled) return;
        settled = true;
        a.removeAttribute('src');
        a.load();
        resolve(result);
      };
      a.addEventListener('loadedmetadata', () => done(true), { once: true });
      a.addEventListener('canplaythrough', () => done(true), { once: true });
      a.addEventListener('error', () => done(false), { once: true });
      setTimeout(() => done(false), 2000);
      a.src = url;
      a.load();
    });
  }

  // ===== 停止 =====

  function stopSound(soundType, card) {
    const sound = activeSounds[soundType];
    if (!sound) return;

    try {
      const ctx = getAudioContext();
      sound.gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

      setTimeout(() => {
        try {
          if (sound.audioElement) {
            sound.audioElement.pause();
            sound.audioElement.removeAttribute('src');
            sound.audioElement.load();
          }
          if (sound.source) sound.source.stop();
          sound.nodes.forEach(n => { try { if (n.stop) n.stop(); } catch(e){} });
        } catch (e) { /* ignore */ }
        delete activeSounds[soundType];
      }, 500);
    } catch (e) {
      delete activeSounds[soundType];
    }

    sound.playing = false;
    if (card) card.classList.remove('active');
  }

  function setVolume(soundType, volume) {
    const sound = activeSounds[soundType];
    if (!sound || !sound.gainNode) return;
    const ctx = getAudioContext();
    sound.gainNode.gain.linearRampToValueAtTime(volume * 0.8, ctx.currentTime + 0.1);
  }

  // ===== 程序化音效生成 =====

  function createProceduralSound(ctx, soundType, outputNode) {
    const generators = {
      rain: generateRain,
      forest: generateForest,
      fire: generateFire,
      waves: generateWaves,
      wind: generateWind,
      river: generateRiver,
      piano: generatePiano
    };

    const fn = generators[soundType];
    if (fn) return fn(ctx, outputNode);
    return generateFallbackNoise(ctx, outputNode);
  }

  // --- 雨声 ---
  function generateRain(ctx, output) {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let env = 0;
      for (let i = 0; i < bufferSize; i++) {
        if (Math.random() < 0.003) env = 0.3 + Math.random() * 0.7;
        env *= 0.9997;
        data[i] = (Math.random() * 2 - 1) * env * 0.15;
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1200; hp.Q.value = 0.3;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 8000;
    source.connect(hp); hp.connect(lp); lp.connect(output);
    source.start();
    return [source];
  }

  // --- 森林 ---
  function generateForest(ctx, output) {
    const nodes = [];
    const buf = ctx.createBuffer(1, 2 * ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.02; b6=w*0.115926;
    }
    const bgSrc = ctx.createBufferSource();
    bgSrc.buffer = buf; bgSrc.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 0.5;
    bgSrc.connect(bp); bp.connect(output); bgSrc.start();
    nodes.push(bgSrc);
    for (let b = 0; b < 3; b++) {
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.value = 2000 + Math.random()*3000;
      const g = ctx.createGain(); g.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3+Math.random()*2;
      const lg = ctx.createGain(); lg.gain.value = 0.015;
      lfo.connect(lg); lg.connect(g.gain);
      osc.connect(g); g.connect(output);
      osc.start(ctx.currentTime+Math.random()*2); lfo.start();
      nodes.push(osc, lfo);
    }
    return nodes;
  }

  // --- 壁炉 ---
  function generateFire(ctx, output) {
    const buf = ctx.createBuffer(1, 2*ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      data[i] = (last + 0.02*(Math.random()*2-1)) / 1.02; last = data[i];
      if (Math.random()<0.0008) data[i]+=(Math.random()-0.5)*1.5;
      data[i] *= 2.5;
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=600;
    const lfo = ctx.createOscillator(); lfo.frequency.value=0.1;
    const lfoG = ctx.createGain(); lfoG.gain.value=0.15;
    const mainG = ctx.createGain(); mainG.gain.value=0.7;
    src.connect(lp); lp.connect(mainG);
    lfo.connect(lfoG); lfoG.connect(mainG.gain); mainG.connect(output);
    src.start(); lfo.start();
    return [src, lfo];
  }

  // --- 海浪 ---
  function generateWaves(ctx, output) {
    const buf = ctx.createBuffer(2, 2*ctx.sampleRate, ctx.sampleRate);
    for (let ch=0;ch<2;ch++) {
      const d=buf.getChannelData(ch); let last=0;
      for (let i=0;i<d.length;i++) { d[i]=(last+0.02*(Math.random()*2-1))/1.02; last=d[i]; d[i]*=3; }
    }
    const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
    const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=400;
    const lfo=ctx.createOscillator(); lfo.frequency.value=0.06;
    const lfoG=ctx.createGain(); lfoG.gain.value=0.4;
    const mainG=ctx.createGain(); mainG.gain.value=0.5;
    src.connect(lp); lp.connect(mainG);
    lfo.connect(lfoG); lfoG.connect(mainG.gain); mainG.connect(output);
    src.start(); lfo.start();
    return [src, lfo];
  }

  // --- 微风 ---
  function generateWind(ctx, output) {
    const buf=ctx.createBuffer(1,2*ctx.sampleRate,ctx.sampleRate);
    const data=buf.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for(let i=0;i<data.length;i++){
      const w=Math.random()*2-1;
      b0=0.99886*b0+w*0.0555179;b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520;b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522;b5=-0.7616*b5-w*0.0168980;
      data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.06;b6=w*0.115926;
    }
    const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=800; bp.Q.value=1.5;
    const lfo=ctx.createOscillator(); lfo.frequency.value=0.08;
    const lfoG=ctx.createGain(); lfoG.gain.value=500;
    lfo.connect(lfoG); lfoG.connect(bp.frequency);
    src.connect(bp); bp.connect(output); src.start(); lfo.start();
    return [src, lfo];
  }

  // --- 河流 ---
  function generateRiver(ctx, output) {
    const buf=ctx.createBuffer(2,2*ctx.sampleRate,ctx.sampleRate);
    for(let ch=0;ch<2;ch++){
      const d=buf.getChannelData(ch); let last=0;
      for(let i=0;i<d.length;i++){d[i]=(last+0.03*(Math.random()*2-1))/1.03;last=d[i];d[i]*=2;}
    }
    const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
    const bp=ctx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1200; bp.Q.value=0.5;
    const lfo=ctx.createOscillator(); lfo.frequency.value=0.2;
    const lfoG=ctx.createGain(); lfoG.gain.value=0.1;
    const mainG=ctx.createGain(); mainG.gain.value=0.8;
    src.connect(bp); bp.connect(mainG);
    lfo.connect(lfoG); lfoG.connect(mainG.gain); mainG.connect(output);
    src.start(); lfo.start();
    return [src, lfo];
  }

  // --- 轻音乐 ---
  function generatePiano(ctx, output) {
    const chords=[[261.6,329.6,392],[220,261.6,329.6],[174.6,220,261.6],[196,246.9,293.7]];
    const dur=chords.length*4;
    const buf=ctx.createBuffer(1,dur*ctx.sampleRate,ctx.sampleRate);
    const data=buf.getChannelData(0);
    for(let ci=0;ci<chords.length;ci++){
      const chord=chords[ci], start=ci*4*ctx.sampleRate, len=4*ctx.sampleRate;
      for(let i=0;i<len;i++){
        const t=i/ctx.sampleRate; let s=0;
        for(const f of chord){const d=Math.exp(-t*0.6);s+=Math.sin(2*Math.PI*f*t)*d*0.08+Math.sin(2*Math.PI*f*2*t)*d*0.02;}
        data[start+i]=s;
      }
    }
    const src=ctx.createBufferSource(); src.buffer=buf; src.loop=true;
    const delay=ctx.createDelay(); delay.delayTime.value=0.3;
    const dg=ctx.createGain(); dg.gain.value=0.3;
    src.connect(output); src.connect(delay); delay.connect(dg); dg.connect(output);
    src.start();
    return [src];
  }

  // --- 兜底 ---
  function generateFallbackNoise(ctx, output) {
    const buf=ctx.createBuffer(1,2*ctx.sampleRate,ctx.sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*0.1;
    const s=ctx.createBufferSource(); s.buffer=buf; s.loop=true;
    s.connect(output); s.start();
    return [s];
  }

  // ===== 停止所有 =====

  function stopAll() {
    Object.keys(activeSounds).forEach(soundType => {
      const card = document.querySelector(`[data-sound="${soundType}"]`);
      stopSound(soundType, card);
      if (card) card.querySelector('.chip-volume').value = 0;
    });
    saveState();
  }

  // ===== 状态持久化 =====

  function getActiveState() {
    const state = {};
    Object.keys(activeSounds).forEach(key => {
      if (activeSounds[key]?.playing) {
        const card = document.querySelector(`[data-sound="${key}"]`);
        state[key] = parseInt(card?.querySelector('.chip-volume')?.value || 0);
      }
    });
    return state;
  }

  function saveState() {
    const state = getActiveState();
    localStorage.setItem('fm_ambientState', JSON.stringify(state));
  }

  function restoreState() {
    try {
      const saved = localStorage.getItem('fm_ambientState');
      if (!saved) return;
      const state = JSON.parse(saved);
      Object.entries(state).forEach(([soundType, volume]) => {
        if (volume > 0 && SOUNDS[soundType]) {
          const card = document.querySelector(`[data-sound="${soundType}"]`);
          if (card) {
            card.querySelector('.chip-volume').value = volume;
            startSound(soundType, card);
            setTimeout(() => setVolume(soundType, volume / 100), 200);
          }
        }
      });
    } catch (e) { /* ignore */ }
  }

  // ===== 公共 API =====

  return {
    init,
    toggleSound,
    stopAll,
    getActiveState,
    SOUNDS
  };
})();