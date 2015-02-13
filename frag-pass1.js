#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D geotex;
uniform sampler2D dentex;

uniform vec4 globalinfo;
float Rmindist;
varying vec3 v_ray;
float minr, maxr;

varying vec2 v_texCoord;
uniform vec4 eye;

vec3 color;

#define DELSIZEX 64.
#define DELSIZEY 64.
#define DELSIZEZ 32.
vec3 msize = vec3( 1./DELSIZEX, 1./DELSIZEY, 1./DELSIZEZ );
const vec3 lshw = vec3( 0. );
const int maxsteps = 256;
const float maxdist = 10.;

vec3 dircomps;

vec4 lastvox;

vec3 ptr;
vec3 dir;
//vec3 CameraOffset;
vec4 sofarcolor;
float totaltravel;

vec4  AtCell( vec3 pos )
{
	float v = texture2D( geotex, vec2( msize.x * msize.y * pos.x + msize.y * pos.y, msize.z * pos.z ) ).a;
	return texture2D( dentex, vec2( v*255.5/256.0, 0.0 ) );
}

bool already_hit;
//Texture layout:
//
//geotex.r = 0 for empty space (keep tracing) otherwise, check trace in objtex.
//geotex.g = space compression X
//geotex.b = space compression Y
//geotex.a = space compression Z
//

float scal = 1.0;
float nscal = 1.0;

void UpdateSoFar()
{
	float intensity = lastvox.a / ( 1.0 + 1.73 - Rmindist );
	float qty = (( 1.0 - sofarcolor.a )) * intensity;
	sofarcolor.rgb += lastvox.rgb * qty * nscal;
	sofarcolor.a += qty;
}

//Large-scale traversal function
void TraverseIn( )
{
	vec3 dists;

	//Load the firsxt voxel in.
	lastvox = AtCell( ( floor(ptr) )  );

	dircomps = -sign( dir );

	//Floor behaves: -0.5 -> -1 / 0.5 -> 0
	//Frac behaves:  -0.1 -> .9, -0.5 -> .5 / -1 becomes 0

	//while( step < maxsteps && length( ptr )<maxdist )
	for( int rstep = 0; rstep < maxsteps; rstep++ )
	{

		//Find the distance to the edges of our local cube.  These
		//are always positive values from 0 to 1.
		vec3 nextsteps = fract( ptr * dircomps  ) ;

		//Note: If you wanted to use jumpmaps, you would add it here.

		//Find out how many units the intersection point between us and
		//the next intersection is in ray space.
		//dists = nextsteps / abs( dir );
		dists = nextsteps / abs( dir );

		//Find the closest axis.  We do this so we don't overshoot a hit.
		float mindist = 0.;

		if( dists.x < dists.y && dists.x < dists.z )
		{
			mindist = dists.x;
			nscal = 1.0;
		}
		else if( dists.y < dists.z )
		{
			mindist = dists.y;
			nscal = .9;
		}
		else
		{
			mindist = dists.z;
			nscal = .8;
		}

		mindist+=.001;

		//Go there, plus a /tiny/ amount to prevent ourselves from hitting
		//an infinite loop.
		vec3 motion = (mindist+0.001) * dir;
		//TotalDistanceTraversed += length( motion );

		ptr += motion;

		totaltravel += mindist;

		Rmindist = mindist;

		if( already_hit )
		{
			UpdateSoFar();
		}
		scal = nscal;

		if( length( ptr - eye.xyz ) > maxr ) break;
		if( ptr.x < 0.0 ) continue;
		if( ptr.y < 0.0 ) continue;
		if( ptr.z < 0.0 ) continue;
		if( ptr.x >= DELSIZEX ) continue;
		if( ptr.y >= DELSIZEY ) continue;
		if( ptr.z >= DELSIZEZ ) continue;


		//Load the new voxel

		//If it's a hit, we're good!  Return 
		lastvox = AtCell( (floor(ptr) )  );
		already_hit = true;

	}
	
	//ptr = vec3( -5000. );
}


void Intersect( int axis, float dalong, vec2 minhit, vec2 maxhit )
{
	//Use ptr / dir.
	float dist;
	vec2 hitplane;
	if( axis == 0 )
	{
		dist = (dalong-ptr.x)/dir.x;
		hitplane = ptr.yz + dir.yz * dist;
	}
	else if( axis == 1 )
	{
		dist = (dalong-ptr.y)/dir.y;
		hitplane = ptr.xz + dir.xz * dist;
	}
	else
	{
		dist = (dalong-ptr.z)/dir.z;
		hitplane = ptr.xy + dir.xy * dist;
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
	already_hit = false;
	sofarcolor = vec4( 0.0 );

	ptr = vec3( eye.xyz );
	dir = normalize(v_ray);

	//Tricky: Intersect the bounds of our world.

	minr = 10000.0;
	maxr = -10000.0;
	Intersect( 0, 0.0, vec2( 0.0, 0.0 ), vec2( DELSIZEY, DELSIZEZ ) );
	Intersect( 1, 0.0, vec2( 0.0, 0.0 ), vec2( DELSIZEX, DELSIZEZ ) );
	Intersect( 2, 0.0, vec2( 0.0, 0.0 ), vec2( DELSIZEX, DELSIZEY ) );

	Intersect( 0, DELSIZEX, vec2( 0.0, 0.0 ), vec2( DELSIZEY, DELSIZEZ ) );
	Intersect( 1, DELSIZEY, vec2( 0.0, 0.0 ), vec2( DELSIZEX, DELSIZEZ ) );
	Intersect( 2, DELSIZEZ, vec2( 0.0, 0.0 ), vec2( DELSIZEX, DELSIZEY ) );

	minr -= .005;
	maxr += .005;

	if( minr < 0.0 ) minr = 0.0;

	if( minr < maxr )
	{

		ptr += dir * minr;
		totaltravel = minr;

		TraverseIn();

		if( already_hit )
		{
			UpdateSoFar();
		}
	}
	gl_FragColor = vec4( mix( vec3( .1, .1, .1 ), sofarcolor.rgb, sofarcolor.a ), 1. );

}





