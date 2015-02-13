uniform mat4 MVPMatrix;
uniform mat4 NormalMatrix;
uniform vec4 LightDir;

attribute vec3 vNormal;
attribute vec4 vTexCoord;
attribute vec4 vPosition;

varying vec3 v_Dot;
varying float fDot;
varying vec2 v_texCoord;

void main()
{
	gl_Position = MVPMatrix * vPosition;
	v_texCoord = vTexCoord.st;
	vec4 transNormal = NormalMatrix * vec4(normalize(vNormal), 1);
	fDot = dot(normalize(transNormal.xyz), normalize(LightDir.xyz)) / 2.0 + .5;
	v_Dot = vec3( fDot );
}
