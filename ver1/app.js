/* Original motion implementation; reference: lusion.co. All media: SNOOZE. */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  let motion = !reduced.matches;
  let lenis = null, renderer = null, scene = null, camera = null;
  let width = innerWidth, height = innerHeight, last = performance.now();
  let frame = 0, alive = true;
  const pointer = { x: width / 2, y: height / 2, sx: width / 2, sy: height / 2, active: false };
  const meshes = [], trails = [];
  const cursor = $('#cursor'), viewer = $('#viewer'), viewerMedia = $('#viewer-media');
  const menu = $('#menu'), menuButton = $('#menu-button'), toggle = $('.motion-toggle');
  const reel = $('#reel'), stage = $('.reel-stage'), reelMedia = $('.reel-media');
  const clamp = x => Math.max(0, Math.min(1, x));
  const smooth = x => x*x*(3-2*x);
  const reelState = { progress: 0, start: [0,0,0,0], end: [0,0,0,0], stageTop: 0 };
  const reelVideo = document.createElement('video');
  reelVideo.id = 'reel-loop'; reelVideo.muted = true; reelVideo.defaultMuted = true;
  reelVideo.autoplay = true; reelVideo.loop = true; reelVideo.playsInline = true;
  reelVideo.preload = 'auto'; reelVideo.poster = reelMedia.dataset.image;
  reelVideo.setAttribute('muted',''); reelVideo.setAttribute('playsinline','');
  reelVideo.setAttribute('aria-hidden','true'); reelVideo.tabIndex = -1;
  reelVideo.src = reelMedia.dataset.video;
  reelMedia.prepend(reelVideo);
  const playLoop = () => { if(motion && !document.hidden) reelVideo.play().catch(()=>{}); };
  reelVideo.addEventListener('loadeddata',playLoop);
  document.addEventListener('pointerdown',playLoop,{once:true});
  const galleryCards = [...document.querySelectorAll('.card')];
  let displayedCards = galleryCards.slice();

  function updateGallery() {
    const mobile = width <= 600;
    displayedCards.forEach((card,index) => {
      // Measure the unmoving grid cell, never the translated image, to avoid feedback.
      const cell = card.getBoundingClientRect();
      const raw = clamp((height*.99-cell.top)/(height*.57));
      const progress = motion ? smooth(raw) : 1;
      const remaining = 1-progress;
      const side = mobile ? 0 : (index%2===0 ? 1 : -1);
      const inward = side * Math.min(width*.043,64)*remaining;
      const rise = (mobile?46:82)*remaining;
      card.style.setProperty('--card-x',`${inward}px`);
      card.style.setProperty('--card-y',`${rise}px`);
      card.style.setProperty('--card-scale',1-.065*remaining);
      card.style.setProperty('--card-caption',smooth(clamp(raw*1.6)));
      card.dataset.enter = progress.toFixed(4);
      card.dataset.side = side;
    });
  }

  function updateReel() {
    const r = reel.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const smallWidth = viewportWidth * (width < 600 ? .65 : .42);
    const smallHeight = smallWidth * 9/16;
    const targetTop = Math.max(94, height*.16);
    const targetHeight = Math.min(height*.78, height-targetTop-24);
    const start = [viewportWidth*.05, height*(width<600?.36:.30), smallWidth, smallHeight];
    const end = [viewportWidth*.05, targetTop, viewportWidth*.9, targetHeight];
    // Pure scroll position: no velocity, spring, timer, overshoot, or free-running wave.
    const progress = motion ? clamp((-r.top / Math.max(1,r.height-height) - .035)/.72) : 1;
    const t = smooth(progress);
    const box = start.map((v,i) => v+(end[i]-v)*t);
    Object.assign(reelState, {progress,start,end,stageTop:sr.top});
    Object.assign(reelMedia.style, {left:`${box[0]}px`,top:`${box[1]}px`,width:`${box[2]}px`,height:`${box[3]}px`});
    stage.style.setProperty('--reel-reveal', smooth(clamp((progress-.72)/.28)));
    stage.style.setProperty('--reel-play', smooth(clamp((progress-.12)/.45)));
    stage.style.setProperty('--intro-opacity', 1-smooth(clamp(progress/.23)));
    reel.dataset.progress = progress.toFixed(4);
  }

  function setupScroll() {
    lenis?.destroy(); lenis = null;
    if (motion && window.Lenis) lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: .85, touchMultiplier: 1 });
  }
  function updateMotion() {
    document.body.classList.toggle('motion-off', !motion);
    toggle.setAttribute('aria-pressed', String(motion));
    toggle.setAttribute('aria-label', motion ? '모션 효과 끄기' : '모션 효과 켜기');
    toggle.textContent = motion ? '≈' : '—';
    setupScroll(); trails.length = 0;
    if(motion) playLoop(); else reelVideo.pause();
  }
  toggle.addEventListener('click', () => { motion = !motion; updateMotion(); });
  reduced.addEventListener('change', () => { motion = !reduced.matches; updateMotion(); });
  updateMotion();

  function closeMenu() {
    menu.hidden = true; menuButton.setAttribute('aria-expanded', 'false');
    menuButton.innerHTML = 'MENU <span>••</span>'; document.body.style.overflow = '';
    lenis?.start();
  }
  menuButton.addEventListener('click', () => {
    if (!menu.hidden) { closeMenu(); return; }
    menu.hidden = false; menuButton.setAttribute('aria-expanded', 'true');
    menuButton.innerHTML = 'CLOSE <span>×</span>'; document.body.style.overflow = 'hidden'; lenis?.stop();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); }
    if (e.key === 'Tab' && !menu.hidden) {
      const stops = [...document.querySelectorAll('.header a,.header button,#menu a')].filter(el => el.getClientRects().length);
      const first = stops[0], end = stops.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
      else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
    }
  });
  document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = document.getElementById(a.hash.slice(1)); if (!target) return;
    e.preventDefault(); closeMenu();
    if (lenis) lenis.scrollTo(target, { offset: -95 });
    else target.scrollIntoView({ behavior: motion ? 'smooth' : 'instant' });
    history.replaceState(null, '', a.hash);
  }));

  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    let count = 0;
    document.querySelectorAll('.card').forEach(card => { card.hidden = filter !== 'all' && filter !== card.dataset.category; if (!card.hidden) count++; });
    displayedCards = galleryCards.filter(card=>!card.hidden);
    $('.gallery-count').textContent = `${count} explorations — and still dreaming.`;
    lenis?.resize();
  }));

  let opener = null;
  document.querySelectorAll('button.media').forEach(button => {
    button.addEventListener('click', () => {
      opener = button; $('#viewer-title').textContent = button.dataset.title;
      $('#viewer-caption').textContent = button.dataset.caption;
      $('#video-error').hidden = true; viewerMedia.replaceChildren();
      const media = document.createElement(button.dataset.video ? 'video' : 'img');
      if (button.dataset.video) {
        media.controls = true; media.playsInline = true; media.preload = 'metadata';
        media.poster = button.dataset.image; media.src = button.dataset.video;
        media.addEventListener('error', () => { $('#video-error').hidden = false; $('#video-error a').href = button.dataset.video; });
      } else { media.src = button.dataset.image; media.alt = button.querySelector('img').alt; }
      viewerMedia.append(media); viewer.showModal(); lenis?.stop(); document.body.style.overflow = 'hidden';
      if (button.dataset.video) media.play().catch(() => {});
    });
  });
  $('#close-viewer').addEventListener('click', () => viewer.close());
  viewer.addEventListener('close', () => {
    viewerMedia.querySelector('video')?.pause(); viewerMedia.replaceChildren();
    document.body.style.overflow = ''; lenis?.start(); opener?.focus({ preventScroll: true });
  });
  document.addEventListener('pointermove', e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = fine.matches;
    if (motion && fine.matches && (trails.length === 0 || Math.hypot(e.clientX - trails[0].x, e.clientY - trails[0].y) > 18)) {
      trails.unshift({ x: e.clientX, y: e.clientY, born: performance.now() }); if (trails.length > 6) trails.pop();
    }
    const target = e.target.closest('button.media'); cursor.classList.toggle('hover', !!target);
    cursor.querySelector('span').textContent = target?.dataset.video ? 'PLAY ▶' : 'VIEW ↗';
  }, { passive: true });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) { pointer.active = false; cursor.style.opacity = 0; } });

  // A subdivided surface changes the silhouette itself, rather than skewing a rectangle.
  const vertex = `
    varying vec2 vUv;
    uniform float uReel, uProgress, uCard, uEnter, uSide;
    uniform vec4 uStart, uEnd;
    uniform vec2 uViewport;
    void main(){
      vUv=uv;
      vec3 p=position;
      if(uReel>.5){
        // Two-axis choreography: top-right opens first, lower edge drags behind.
        // The wave traverses right to left ONCE as scroll progresses; no time input.
        float progress=uProgress;
        float delay=(1.-uv.y)*.34+(1.-uv.x)*.035;
        float local=clamp((progress-delay)/(1.-delay),0.,1.);
        float eased=local*local*(3.-2.*local);
        float globalEase=progress*progress*(3.-2.*progress);
        vec2 point=vec2(uv.x,1.-uv.y);
        vec2 from=uStart.xy+point*uStart.zw;
        vec2 to=uEnd.xy+point*uEnd.zw;
        vec2 screen=mix(from,to,eased);
        float lower=clamp((progress-.18)/.82,0.,1.);
        lower=lower*lower*(3.-2.*lower);
        screen.y=mix(from.y,to.y,mix(lower,globalEase,uv.y));
        float envelope=pow(max(0.,sin(progress*3.14159265)),1.8);
        float travelling=sin(progress*6.283185-.63+(1.-uv.x)*2.3+(1.-uv.y)*.6);
        // A curled leading corner, then a soft S bend on the trailing edge.
        screen.y+=envelope*uViewport.y*.115*travelling*(.08+.92*uv.x);
        screen.y+=envelope*uViewport.y*.055*(1.-uv.x)*uv.y;
        screen.x+=envelope*uViewport.x*.065*sin(progress*6.283185-uv.y*2.3)*sin(uv.y*3.14159265+.4)*mix(.5*progress,-1.,uv.x);
        p=vec3(screen.x-uViewport.x*.5,uViewport.y*.5-screen.y,0.);
      } else if(uCard>.5){
        float remaining=1.-uEnter;
        // At most ~8px: the paired cards gently unfold out from the centre seam.
        float edge=mix(uv.x,1.-uv.x,step(0.,uSide));
        p.y+=sin(uv.x*3.14159265)*remaining*.018;
        p.x+=sin(uv.y*3.14159265)*remaining*.012*uSide;
        p.y+=edge*remaining*.009;
      }
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
    }`;
  const fragment = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec2 uSize,uImage,uPointer;
    uniform vec4 uTrail[6];
    uniform float uHover,uTime,uMotion,uHero;
    void main(){
      vec2 uv=vUv;
      float aspect=uSize.x/uSize.y;
      for(int i=0;i<6;i++){
        vec2 delta=(uv-uTrail[i].xy)*vec2(aspect,1.);
        float d=length(delta), age=uTrail[i].z;
        float wave=sin(d*31.-age*7.)*exp(-d*7.)*exp(-age*2.2)*uTrail[i].w;
        uv+=normalize(delta+vec2(.00001))*wave*.024*uMotion;
      }
      vec2 near=(uv-uPointer)*vec2(aspect,1.);
      uv+=near*exp(-length(near)*5.)*.08*uHover*uMotion;
      uv=(uv-.5)/(1.+.035*uHover*uMotion)+.5;
      float imageAspect=uImage.x/uImage.y;
      vec2 cover=vec2(min(aspect/imageAspect,1.),min(imageAspect/aspect,1.));
      vec2 sampleUv=(uv-.5)*cover+.5;
      vec4 color=texture2D(uTexture,clamp(sampleUv,.001,.999));
      vec2 px=vUv*uSize;
      float radius=min(18.,min(uSize.x,uSize.y)*.045);
      vec2 q=abs(px-uSize*.5)-(uSize*.5-radius);
      float sdf=length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
      float alpha=1.-smoothstep(-1.,1.,sdf);
      color.rgb*=1.-uHero*.16*(1.-vUv.y);
      gl_FragColor=vec4(color.rgb,alpha);
    }`;
  function setupWebGL() {
    if (!window.THREE) return;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.domElement.id = 'warp-canvas'; renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6)); renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0); document.body.append(renderer.domElement);
      scene = new THREE.Scene(); camera = new THREE.OrthographicCamera(-width/2,width/2,height/2,-height/2,.1,1000); camera.position.z=500;
      const loader = new THREE.TextureLoader();
      document.querySelectorAll('.media').forEach(element => {
        const uniforms = {
          uTexture:{value:null},uSize:{value:new THREE.Vector2(1,1)},uImage:{value:new THREE.Vector2(1,1)},
          uPointer:{value:new THREE.Vector2(.5,.5)},uTrail:{value:Array.from({length:6},()=>new THREE.Vector4(0,0,9,0))},
          uReel:{value:element===reelMedia?1:0},uProgress:{value:0},uStart:{value:new THREE.Vector4()},uEnd:{value:new THREE.Vector4()},uViewport:{value:new THREE.Vector2(width,height)},
          uCard:{value:element.closest('.card')?1:0},uEnter:{value:1},uSide:{value:0},
          uHover:{value:0},uTime:{value:0},uMotion:{value:motion?1:0},uHero:{value:element.dataset.hero?1:0}
        };
        const material = new THREE.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthTest:false,depthWrite:false});
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1,1,64,48),material); mesh.visible=false; mesh.frustumCulled=false; scene.add(mesh);
        const item={element,mesh,uniforms,loaded:false,hover:0}; meshes.push(item);
        loader.load(element.dataset.image,texture=>{
          texture.minFilter=THREE.LinearFilter; texture.magFilter=THREE.LinearFilter; texture.generateMipmaps=false;
          if(!item.videoTexture){uniforms.uTexture.value=texture; uniforms.uImage.value.set(texture.image.width,texture.image.height);}
          else texture.dispose();
          item.loaded=true;
          if(alive) element.classList.add('webgl-ready');
        },undefined,()=>{ mesh.visible=false; });
        if(element===reelMedia){
          const attachVideo=()=>{
            if(!reelVideo.videoWidth||item.videoTexture)return;
            const texture=new THREE.VideoTexture(reelVideo);
            texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
            uniforms.uTexture.value=texture;
            uniforms.uImage.value.set(reelVideo.videoWidth,reelVideo.videoHeight);
            item.videoTexture=texture;item.loaded=true;
            if(alive)element.classList.add('webgl-ready');
          };
          reelVideo.addEventListener('loadeddata',attachVideo,{once:true});
          if(reelVideo.readyState>=2)attachVideo();
        }
      });
      renderer.domElement.addEventListener('webglcontextlost',e=>{
        e.preventDefault(); alive=false; meshes.forEach(item=>item.element.classList.remove('webgl-ready')); renderer.domElement.style.display='none';
      });
    } catch (error) {
      renderer?.domElement.remove(); renderer=null; meshes.forEach(item=>item.element.classList.remove('webgl-ready'));
      console.warn('Using accessible image fallback.',error.message);
    }
  }
  setupWebGL();
  window.addEventListener('resize',()=>{
    width=innerWidth; height=innerHeight;
    if(renderer&&camera){renderer.setSize(width,height);camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();}
    lenis?.resize();
  },{passive:true});

  function tick(now) {
    frame=requestAnimationFrame(tick);
    if(document.hidden)return;
    const dt=Math.min((now-last)/16.667,3); last=now; lenis?.raf(now);
    const y=scrollY;
    $('.header').classList.toggle('is-scrolled', y > 80);
    updateReel();
    updateGallery();
    pointer.sx+=(pointer.x-pointer.sx)*(1-Math.pow(.78,dt)); pointer.sy+=(pointer.y-pointer.sy)*(1-Math.pow(.78,dt));
    if(fine.matches && motion){cursor.style.transform=`translate3d(${pointer.sx}px,${pointer.sy}px,0)`;cursor.style.opacity=pointer.active?'1':'0';}
    if(!renderer||!alive)return;
    for(const item of meshes){
      const {element,mesh,uniforms:u}=item; const rect=element.getBoundingClientRect();
      const isReel = element===reelMedia;
      const card=element.closest('.card');
      if(card){u.uEnter.value=Number(card.dataset.enter??1);u.uSide.value=Number(card.dataset.side??0);}
      const visible=item.loaded&&rect.width>0&&(isReel ? reelState.stageTop<height && reelState.stageTop+height>0 : rect.bottom>-150&&rect.top<height+150);
      mesh.visible=visible; if(!visible)continue;
      mesh.position.set(rect.left+rect.width/2-width/2,height/2-rect.top-rect.height/2,0); mesh.scale.set(rect.width,rect.height,1);
      if(isReel){
        mesh.position.set(0,0,0);mesh.scale.set(1,1,1);
        const a=reelState.start,b=reelState.end;
        u.uStart.value.set(a[0],a[1]+reelState.stageTop,a[2],a[3]);
        u.uEnd.value.set(b[0],b[1]+reelState.stageTop,b[2],b[3]);
        u.uViewport.value.set(width,height);u.uProgress.value=reelState.progress;
      }
      const hover=pointer.active&&pointer.x>rect.left&&pointer.x<rect.right&&pointer.y>rect.top&&pointer.y<rect.bottom;
      item.hover+=((hover?1:0)-item.hover)*(1-Math.pow(.89,dt));
      u.uSize.value.set(rect.width,rect.height);u.uTime.value=now/1000;u.uHover.value=item.hover;u.uMotion.value=motion&&element.dataset.hero?1:0;
      u.uPointer.value.set((pointer.sx-rect.left)/rect.width,1-(pointer.sy-rect.top)/rect.height);
      for(let i=0;i<6;i++){
        const trail=trails[i];
        if(trail){const age=(now-trail.born)/1000;const inside=trail.x>rect.left&&trail.x<rect.right&&trail.y>rect.top&&trail.y<rect.bottom;
          u.uTrail.value[i].set((trail.x-rect.left)/rect.width,1-(trail.y-rect.top)/rect.height,age,inside&&age<3?1:0);
        }else u.uTrail.value[i].w=0;
      }
    }
    renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(tick);
  document.addEventListener('visibilitychange',()=>{last=performance.now();if(document.hidden)reelVideo.pause();else playLoop();});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);lenis?.destroy();renderer?.dispose();});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
})();
