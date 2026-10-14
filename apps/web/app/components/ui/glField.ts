// A canvas painted by one fragment shader on the graphics card (WebGL2), for the site's background effects.
// The page only sends a few numbers per frame; the per-pixel work runs on the GPU instead of the CPU.
// Returns null where WebGL2 isn't available, so callers can keep their CPU drawing as a fallback.

export type Uniforms = Record<string, number | readonly number[]>;

export interface GlField {
  gl: WebGL2RenderingContext;
  /** Match the drawing buffer to the canvas's CSS size (times the device pixel ratio, capped at 2). */
  resize: (cssWidth: number, cssHeight: number) => void;
  draw: (uniforms: Uniforms) => void;
  /** A small RGBA texture the shader reads as `uData` (e.g. one texel per grid cell). */
  setData: (width: number, height: number, bytes: Uint8Array) => void;
  destroy: () => void;
}

const VERTEX = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

export function createGlField(canvas: HTMLCanvasElement, fragment: string): GlField | null {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
  } catch {
    gl = null;
  }
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl!.createShader(type)!;
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      console.warn("[glField] shader error:", gl!.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) return null;
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[glField] link error:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  // One triangle that covers the whole canvas.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const locations = new Map<string, WebGLUniformLocation | null>();
  const loc = (name: string) => {
    if (!locations.has(name)) locations.set(name, gl!.getUniformLocation(program, name));
    return locations.get(name)!;
  };

  let texture: WebGLTexture | null = null;
  let dpr = 1;

  return {
    gl,
    resize(cssWidth, cssHeight) {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(cssWidth * dpr));
      const h = Math.max(1, Math.round(cssHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl!.viewport(0, 0, w, h);
    },
    draw(uniforms) {
      const g = gl!;
      g.uniform2f(loc("uSize"), canvas.width / dpr, canvas.height / dpr);
      g.uniform1f(loc("uDpr"), dpr);
      for (const [name, value] of Object.entries(uniforms)) {
        const l = loc(name);
        if (!l) continue;
        if (typeof value === "number") g.uniform1f(l, value);
        else if (value.length === 2) g.uniform2f(l, value[0]!, value[1]!);
        else if (value.length === 3) g.uniform3f(l, value[0]!, value[1]!, value[2]!);
        else if (value.length === 4) g.uniform4f(l, value[0]!, value[1]!, value[2]!, value[3]!);
      }
      if (texture) {
        g.activeTexture(g.TEXTURE0);
        g.bindTexture(g.TEXTURE_2D, texture);
        g.uniform1i(loc("uData"), 0);
      }
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      g.drawArrays(g.TRIANGLES, 0, 3);
    },
    setData(width, height, bytes) {
      const g = gl!;
      if (!texture) {
        texture = g.createTexture();
        g.bindTexture(g.TEXTURE_2D, texture);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      } else {
        g.bindTexture(g.TEXTURE_2D, texture);
      }
      g.pixelStorei(g.UNPACK_ALIGNMENT, 1);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, width, height, 0, g.RGBA, g.UNSIGNED_BYTE, bytes);
    },
    destroy() {
      const g = gl!;
      if (texture) g.deleteTexture(texture);
      g.deleteBuffer(buffer);
      g.deleteProgram(program);
      g.deleteShader(vs);
      g.deleteShader(fs);
      g.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
