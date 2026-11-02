import { Config } from "@remotion/cli/config";

// WebGL das batidas 3D (docs/roteiro-3d.md). "angle" usa a placa de vídeo quando há uma.
// Sem GPU (nuvem, CI): --gl=swangle na linha de comando, ou MOTOR_GL=swangle. Linux com NVIDIA: MOTOR_GL=vulkan.
type Gl = "angle" | "egl" | "swangle" | "swiftshader" | "vulkan" | "angle-egl";
Config.setChromiumOpenGlRenderer((process.env.MOTOR_GL as Gl | undefined) ?? "angle");
