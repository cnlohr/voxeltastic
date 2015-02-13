#ifdef GL_ES
precision mediump float;
#endif

uniform mat4 ModexlViewMatrix;
uniform mat4 MVPMatrix;
uniform mat4 NormalMatrix;
uniform vec4 LightDir;

uniform vec4 eye;
uniform vec4 at;
uniform vec4 up;
uniform vec4 aspect;

attribute vec3 vNormal;
attribute vec4 vTexCoord;
attribute vec4 vPosition;

varying vec2 v_texCoord;

varying vec3 v_ray;

void main()
{
	vec4 vpp = vPosition * 2. - 1.;
	gl_Position = vpp;
	v_texCoord = vPosition.xy;//vTexCoord.st;

	vec3 fwd = normalize( at.xyz - eye.xyz ); // 2.0 tunes FOV
	vec3 right = ( cross( fwd, up.xyz ) );
	vec3 nup = ( cross( right, fwd ) );
	right = normalize( right );
	nup = normalize( nup );

	vpp *= vec4( aspect.xy, 1.0, 1.0 );

	v_ray = fwd + right * vpp.x + nup * vpp.y;
}

