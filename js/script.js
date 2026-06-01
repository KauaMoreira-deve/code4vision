const canvas = document.getElementById("aurora");
const gl = canvas.getContext("webgl");

if (!gl) {
  alert("WebGL não suportado");
}

/* =========================
   RESIZE
========================= */
function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;

  gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener("resize", resize);

resize();

/* =========================
   VERTEX SHADER
========================= */
const vertexShaderSource = `
attribute vec2 position;

varying vec2 vUv;

void main(){

  vUv = position * 0.5 + 0.5;

  gl_Position = vec4(position,0.0,1.0);
}
`;

/* =========================
   FRAGMENT SHADER
========================= */
const fragmentShaderSource = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;

/* =========================
   HASH
========================= */
vec3 hash(vec3 p){

  p = vec3(
    dot(p, vec3(127.1,311.7,74.7)),
    dot(p, vec3(269.5,183.3,246.1)),
    dot(p, vec3(113.5,271.9,124.6))
  );

  return fract(sin(p) * 43758.5453123);
}

/* =========================
   NOISE
========================= */
float noise(vec3 p){

  vec3 i = floor(p);
  vec3 f = fract(p);

  vec3 u = f*f*(3.0-2.0*f);

  return mix(
    mix(
      mix(
        dot(hash(i + vec3(0,0,0)), f - vec3(0,0,0)),
        dot(hash(i + vec3(1,0,0)), f - vec3(1,0,0)),
        u.x
      ),

      mix(
        dot(hash(i + vec3(0,1,0)), f - vec3(0,1,0)),
        dot(hash(i + vec3(1,1,0)), f - vec3(1,1,0)),
        u.x
      ),

      u.y
    ),

    mix(
      mix(
        dot(hash(i + vec3(0,0,1)), f - vec3(0,0,1)),
        dot(hash(i + vec3(1,0,1)), f - vec3(1,0,1)),
        u.x
      ),

      mix(
        dot(hash(i + vec3(0,1,1)), f - vec3(0,1,1)),
        dot(hash(i + vec3(1,1,1)), f - vec3(1,1,1)),
        u.x
      ),

      u.y
    ),

    u.z
  );
}

/* =========================
   FBM
========================= */
float fbm(vec3 p){

  float value = 0.0;
  float amp = 0.5;

  for(int i=0;i<5;i++){

    value += noise(p) * amp;

    p *= 2.0;

    amp *= 0.5;
  }

  return value;
}

/* =========================
   MAIN
========================= */
void main(){

  vec2 uv = gl_FragCoord.xy / uResolution.xy;

  vec2 centered = uv - 0.5;

  centered.x *= uResolution.x / uResolution.y;

  /* TEMPO MAIS LENTO */
  float t = uTime * 0.18;

  vec2 mouse = (uMouse - 0.5) * 0.08;

  /* MOVIMENTO HORIZONTAL SUAVE */
  centered.x += sin(t * 0.35) * 0.18;

  vec3 p = vec3(
    centered.x * 1.8 + mouse.x,
    centered.y * 1.0 + mouse.y,
    t
  );

  float n = fbm(p);

  /* ONDAS SUAVES */
  float wave =
    sin(centered.x * 2.6 + n * 1.8 - t * 1.2)
    * 0.045;

  wave +=
    sin(centered.x * 5.0 - t * 0.8)
    * 0.015;

  float dist =
    abs(centered.y + wave);

  /* NÚCLEO */
  float core =
    exp(-dist * 38.0);

  /* GLOW */
  float glow =
    exp(-dist * 8.0) * 0.42;

  /* GLOW GRANDE */
  float bigGlow =
    exp(-dist * 2.5) * 0.16;

  float band =
    core + glow + bigGlow;

  /* FADE NAS PONTAS */
  float fade =
    smoothstep(1.6, 0.2, abs(centered.x));

  band *= fade;

  /* CORES */
  vec3 colorA =
    vec3(0.18,0.48,1.0);

  vec3 colorB =
    vec3(0.50,0.15,1.0);

  vec3 aurora =
    mix(
      colorA,
      colorB,
      sin(centered.x * 1.5 + t * 0.5) * 0.5 + 0.5
    );

  aurora *= band;

  /* BRILHO SUAVE */
  aurora +=
    vec3(1.0) * glow * 0.08;

  /* BLOOM LEVE */
  aurora +=
    vec3(0.7,0.85,0.75) * bigGlow * 0.05;

  /* INTENSIDADE FINAL */
  aurora *= 1.05;

  gl_FragColor = vec4(aurora,1.0);
}
`;

/* =========================
   CREATE SHADER
========================= */
function createShader(type, source) {

  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  return shader;
}

const vertexShader = createShader(
  gl.VERTEX_SHADER,
  vertexShaderSource
);

const fragmentShader = createShader(
  gl.FRAGMENT_SHADER,
  fragmentShaderSource
);

/* =========================
   PROGRAM
========================= */
const program = gl.createProgram();

gl.attachShader(program, vertexShader);

gl.attachShader(program, fragmentShader);

gl.linkProgram(program);

gl.useProgram(program);

/* =========================
   GEOMETRY
========================= */
const vertices = new Float32Array([
  -1,-1,
   1,-1,
  -1, 1,

  -1, 1,
   1,-1,
   1, 1
]);

const buffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

gl.bufferData(
  gl.ARRAY_BUFFER,
  vertices,
  gl.STATIC_DRAW
);

const position = gl.getAttribLocation(
  program,
  "position"
);

gl.enableVertexAttribArray(position);

gl.vertexAttribPointer(
  position,
  2,
  gl.FLOAT,
  false,
  0,
  0
);

/* =========================
   UNIFORMS
========================= */
const uTime =
  gl.getUniformLocation(program, "uTime");

const uResolution =
  gl.getUniformLocation(program, "uResolution");

const uMouse =
  gl.getUniformLocation(program, "uMouse");

/* =========================
   MOUSE
========================= */
let mouseX = 0.5;
let mouseY = 0.5;

window.addEventListener("mousemove", (e) => {

  mouseX = e.clientX / innerWidth;

  mouseY =
    1.0 - (e.clientY / innerHeight);
});

/* =========================
   RENDER
========================= */
function render(time) {

  time *= 0.001;

  gl.uniform1f(uTime, time);

  gl.uniform2f(
    uResolution,
    canvas.width,
    canvas.height
  );

  gl.uniform2f(
    uMouse,
    mouseX,
    mouseY
  );

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);