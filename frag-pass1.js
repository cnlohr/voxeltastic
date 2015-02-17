#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D geotex;
uniform sampler2D dentex;

uniform vec4 globalinfo;
uniform vec4 terms;
float Rmindist;
varying vec3 v_ray;
float minr, maxr;

varying vec2 v_texCoord;
uniform vec4 eye;

vec3 color;

uniform vec4 delsizes;
uniform vec4 stretch;
vec3 msize;
float DELSIZEX;
float DELSIZEY;
float DELSIZEZ;
vec3 delsizescale;
vec3 delsizescaleinv;

const vec3 lshw = vec3( 0. );
const int maxsteps = 512;
const float maxdist = 10.;

vec3 dircomps;

vec4 lastvox;

vec3 ptr;
vec3 dir;
vec4 sofarcolor;
float totaltravel;
vec3 lastnorm;

vec4  AtCell( vec3 pos )
{
	vec4 v = texture2D( geotex, vec2( msize.x * msize.y * pos.x + msize.y * pos.y, msize.z * pos.z ) );
	lastnorm = normalize((v.xyz-0.5)*2.0);
	return texture2D( dentex, vec2( v.a*255.5/256.0, 0.0 ) );
}

bool already_hit;

float scal = 1.0;
float nscal = 1.0;

void UpdateSoFar()
{
	float intensity = pow( lastvox.a, (2.73-Rmindist) );
	float qty = (( 1.0 - sofarcolor.a )) * intensity;
	sofarcolor.rgb += ( dot( lastnorm.xyz, vec3(1.,1.,1.) ) / 2.0 + 1.0 )  * qty* lastvox.rgb;// * qty * dot( lastnorm, -dir );
	sofarcolor.a += qty;
}

//Large-scale traversal function
void TraverseIn( )
{
	vec3 dists;

	//Load the firsxt voxel in.
	lastvox = AtCell( ( floor(ptr) )  );

	dircomps = -sign( dir );

	for( int rstep = 0; rstep < maxsteps; rstep++ )
	{

		//Find the distance to the edges of our local cube.  These
		//are always positive values from 0 to 1.
		vec3 nextsteps = fract( ptr * dircomps  ) ;

		//Find out how many units the intersection point between us and
		//the next intersection is in ray space.
		//dists = nextsteps / abs( dir );
		dists = nextsteps / abs( dir );

		//Find the closest axis.  We do this so we don't overshoot a hit.
		float mindist = 0.;

		if( dists.x < dists.y && dists.x < dists.z )
		{
			mindist = dists.x;
			nscal = stretch.x;
		}
		else if( dists.y < dists.z )
		{
			mindist = dists.y;
			nscal = stretch.y;
		}
		else
		{
			mindist = dists.z;
			nscal = stretch.z;
		}

		mindist+=.001;

		//Go there, plus a /tiny/ amount to prevent ourselves from hitting
		//an infinite loop.
		vec3 motion = (mindist+0.001) * dir;
		//TotalDistanceTraversed += length( motion );

		ptr += motion;

		totaltravel += length(motion*stretch.xyz);

		Rmindist = mindist;

		if( already_hit )
		{
			UpdateSoFar();
		}
		scal = nscal;

		if( totaltravel > maxr ) break;
		if( ptr.x < 0.0 ) continue;
		if( ptr.y < 0.0 ) continue;
		if( ptr.z < 0.0 ) continue;
		if( ptr.x >= delsizes.x ) continue;
		if( ptr.y >= delsizes.y ) continue;
		if( ptr.z >= delsizes.z ) continue;


		//Load the new voxel

		//If it's a hit, we're good!  Return 
		lastvox = AtCell( (floor(ptr) )  );
		already_hit = true;

	}
}


void Intersect( int axis, float dalong, vec2 minhit, vec2 maxhit )
{
	//Use ptr / dir.
	float dist;
	vec2 hitplane;
	if( axis == 0 )
	{
		dist = (dalong-ptr.x)/dir.x;
		hitplane = (ptr.yz + dir.yz * dist);
	}
	else if( axis == 1 )
	{
		dist = (dalong-ptr.y)/dir.y;
		hitplane = (ptr.xz + dir.xz * dist);
	}
	else
	{
		dist = (dalong-ptr.z)/dir.z;
		hitplane = (ptr.xy + dir.xy * dist);
	}

	float hit = 1.0;
	if( hitplane.x < minhit.x  || hitplane.y < minhit.y || hitplane.x > maxhit.x || hitplane.y > maxhit.y )
		hit = 0.0;

	if( hit > 0.5 )
	{
		if( dist < minr ) minr = dist;
		if( dist > maxr ) maxr = dist;
	}

}

void main()
{
	DELSIZEX = delsizes.x;
	DELSIZEY = delsizes.y;
	DELSIZEZ = delsizes.z;
	msize = vec3( 1./DELSIZEX, 1./DELSIZEY, 1./DELSIZEZ );

	delsizescale    = delsizes.xyz / stretch.xyz;
	delsizescaleinv = delsizes.xyz * stretch.xyz;

	already_hit = false;
	sofarcolor = vec4( 0.0 );

	ptr = vec3( eye.xyz/stretch.xyz );
	dir = normalize(v_ray)/stretch.xyz;

	//Tricky: Intersect the bounds of our world.

	minr = 10000.0;
	maxr = -10000.0;
	Intersect( 0, 0.0, vec2( 0.0, 0.0 ), terms.yz );
	Intersect( 1, 0.0, vec2( 0.0, 0.0 ), terms.xz );
	Intersect( 2, 0.0, vec2( 0.0, 0.0 ), terms.xy );

	Intersect( 0, terms.x, vec2( 0.0, 0.0 ), terms.yz );
	Intersect( 1, terms.y, vec2( 0.0, 0.0 ), terms.xz );
	Intersect( 2, terms.z, vec2( 0.0, 0.0 ), terms.xy );


	float dirdot = dot( normalize(v_ray), stretch.xyz );
//	float dirdot = 1.0;
//	maxr *= 100.0;//00.0;
//	minr = 0.0;
//	maxr *= 1.+dirdot;
//	minr *= dirdot;

//	minr *= .5;
//	maxr *= 10.0;
//	minr /= dirdot;
//	minr /= stretch.x*stretch.y*stretch.z;
//	maxr /= stretch.x*stretch.y*stretch.z;
	minr -= .005;
	maxr += .005;
//	maxr*=1000.0;


//	gl_FragColor = vec4( minr/100.0, maxr/100.0, dirdot, 1.0 );
//	return;
//	maxr*=10.0;

	ptr = vec3( eye.xyz/stretch.xyz );
	dir = normalize(v_ray)/stretch.xyz;

	//If we're inside the cube, we want it to end.
	if( minr < 0.0 ) minr = 0.0;

	if( minr < maxr )
	{

		ptr = ptr + dir * minr;//(ptr*stretch.xyz + dir * minr * stretch.xyz)/stretch.xyz;
		totaltravel = minr;

		TraverseIn();

		if( already_hit )
		{
			UpdateSoFar();
		}
	}
	gl_FragColor = vec4( mix( vec3( .1, .1, .1 ), sofarcolor.rgb, sofarcolor.a ), 1. ) ;

}





