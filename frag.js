#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D sampler2d;

varying vec3 v_Dot;
varying vec2 v_texCoord;
varying float fDot;

void main()
{
	vec2 texCoord = vec2(v_texCoord.s, 1.0 - v_texCoord.t);
	vec4 color = texture2D(sampler2d, texCoord);
	color.a = 1.;
	color += vec4(0.1, 0.1, 0.1, 0.0);
	gl_FragColor = vec4(color.xyz * v_Dot, color.a);
}
