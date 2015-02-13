//XXX: TODO: Speed up sphere misses (Find out when we'll totally miss)
//Use infinity instead of 10000

//Create a system for finding intersections quickly.
//It takes on the verts and indices in the OpenGL style, then creates a BVH.
function CreateCDFromModel( verts, indices )
{
	var lverts = [];
	var lids = [];
	for( var i = 0; i < indices.length/3; i++ )
	{
		lverts.push( verts[indices[i*3+0]*3+0] );
		lverts.push( verts[indices[i*3+0]*3+1] );
		lverts.push( verts[indices[i*3+0]*3+2] );

		lverts.push( verts[indices[i*3+1]*3+0] );
		lverts.push( verts[indices[i*3+1]*3+1] );
		lverts.push( verts[indices[i*3+1]*3+2] );

		lverts.push( verts[indices[i*3+2]*3+0] );
		lverts.push( verts[indices[i*3+2]*3+1] );
		lverts.push( verts[indices[i*3+2]*3+2] );

		lids.push(i);
	}

	return new BoundingSpehereSet( lverts, lids );
}

function CrossArrays( a, b )
{
	return [a[1]*b[2]-a[2]*b[1],
		b[0]*a[2]-b[2]*a[0],
		a[0]*b[1]-a[1]*b[0] ];
}

function SubArrays( a, b )
{
	return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
}

function ArrayLength( a )
{
	return Math.sqrt( a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
}

function Normalize( a )
{
	var len = ArrayLength( a );
	return [ a[0] / len, a[1] / len, a[2] / len ];
}

function AddArrays( a, b )
{
	return [a[0]+b[0],
		a[1]+b[1],
		a[2]+b[2]];
}

function ScalarArrays( a, s )
{
	return [a[0]*s,
		a[1]*s,
		a[2]*s];
}

function DotArrays( a, b )
{
	return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

function BoundingSpehereSet( verts, triangleids )
{
	this.radius = 0;
	this.center = [0,0,0];
	this.verts = verts;
	this.tags = triangleids;

	this.mins = [10000,10000,10000];
	this.maxs = [-10000,-10000,-10000];
	this.children = [];

	for( var i = 0; i < verts.length/3; i++ )
	{
		if( verts[i*3+0] < this.mins[0] ) this.mins[0] = verts[i*3+0];
		if( verts[i*3+0] > this.maxs[0] ) this.maxs[0] = verts[i*3+0];
		if( verts[i*3+1] < this.mins[1] ) this.mins[1] = verts[i*3+1];
		if( verts[i*3+1] > this.maxs[1] ) this.maxs[1] = verts[i*3+1];
		if( verts[i*3+2] < this.mins[2] ) this.mins[2] = verts[i*3+2];
		if( verts[i*3+2] > this.maxs[2] ) this.maxs[2] = verts[i*3+2];
	}
	this.center = [ (this.maxs[0]+this.mins[0])/2, (this.maxs[1]+this.mins[1])/2, (this.maxs[2]+this.mins[2])/2 ];

	var boxsize = SubArrays( this.maxs, this.mins );
	var maxaxis = 0;
	if( boxsize[1] >= boxsize[0] && boxsize[1] >= boxsize[2] ) maxaxis = 1;
	if( boxsize[2] >= boxsize[0] && boxsize[2] >= boxsize[1] ) maxaxis = 2;

	this.radius = boxsize[maxaxis]/2;

//	cwg.trace( "New:\n MIN:" + this.mins + "\n MAX:" + this.maxs + "\n CENTER:" + this.center + "\n Radius:" + this.radius );

	//[private]
	this.splitIntoTwo = function()
	{

		//find axis for split
		var lengths = SubArrays( this.maxs, this.mins );
		var splitaxis = 0;
		if( lengths[1] >= lengths[0] && lengths[1] >= lengths[2] ) splitaxis = 1;
		if( lengths[2] >= lengths[0] && lengths[2] >= lengths[1] ) splitaxis = 2;

		var triangles = [];
		for( var i = 0; i < this.verts.length/9; i++ )
		{
			var obj = new Object();
			obj.center = [
				( this.verts[i*9+0] + this.verts[i*9+3] + this.verts[i*9+6] ) / 3,
				( this.verts[i*9+1] + this.verts[i*9+4] + this.verts[i*9+7] ) / 3,
				( this.verts[i*9+2] + this.verts[i*9+5] + this.verts[i*9+8] ) / 3 ];
			obj.v1 = [this.verts[i*9+0], this.verts[i*9+1], this.verts[i*9+2]];
			obj.v2 = [this.verts[i*9+3], this.verts[i*9+4], this.verts[i*9+5]];
			obj.v3 = [this.verts[i*9+6], this.verts[i*9+7], this.verts[i*9+8]];

			obj.tag = this.tags[i];
			triangles.push( obj );
		}

		triangles.sort( function( a, b ) { 
			var xa = a.center[splitaxis];
			var xb = b.center[splitaxis];			
			var ret = (xa == xb)?0:((xa<xb)?-1:1);
			return ret;
//			alert( "xa: " + xa + " xb: " + xb + " Ret: " + ret );
		} );
		
		var splitpoint = Math.floor(triangles.length/2);

		var totri = [];
		var totag = [];

		var minxs = 10000;
		var maxxs = -10000;

		for( var i = 0; i < splitpoint; i++ )
		{
			totri.push( triangles[i].v1[0] );
			totri.push( triangles[i].v1[1] );
			totri.push( triangles[i].v1[2] );
			totri.push( triangles[i].v2[0] );
			totri.push( triangles[i].v2[1] );
			totri.push( triangles[i].v2[2] );
			totri.push( triangles[i].v3[0] );
			totri.push( triangles[i].v3[1] );
			totri.push( triangles[i].v3[2] );
			totag.push( triangles[i].tag );
		}
		this.children.push( new BoundingSpehereSet( totri, totag ) );

		totri = [];
		totag = [];
		for( var i = splitpoint; i < triangles.length; i++ )
		{
			totri.push( triangles[i].v1[0] );
			totri.push( triangles[i].v1[1] );
			totri.push( triangles[i].v1[2] );
			totri.push( triangles[i].v2[0] );
			totri.push( triangles[i].v2[1] );
			totri.push( triangles[i].v2[2] );
			totri.push( triangles[i].v3[0] );
			totri.push( triangles[i].v3[1] );
			totri.push( triangles[i].v3[2] );
			totag.push( triangles[i].tag );
		}

		this.children.push( new BoundingSpehereSet( totri, totag ) );
		this.verts = [];
		this.tags = [];
	}

	///After the object is created, call this to make it go fast.
	this.recursiveSplit = function()
	{

		if( this.tags.length > 10 )
		{
			this.splitIntoTwo();
//			cwg.trace( this.radius + " " + this.tags.length );
			for( var i = 0; i < this.children.length; i++ )
			{
//				cwg.trace( "  -> " + this.children[i].tags.length );
				this.children[i].recursiveSplit();
			}
		}
	}

	///Trace ray into object.  Ray must be in object space & must be unit length.
	this.traceRay = function( rayStart, rayDirection )
	{
		var ret = [];

		//Ray tracing ray to sphere.  Step 1: Find relative offset.
		var relofs = SubArrays( rayStart, this.center );

		//Distance from point to point on ray = magnitude(rayStart + t*rayDirection)
		//Solve for magnitude(rayStart + t*rayDirection) = radius
		// (rayStart+t*rayDirection)^2-radius^2 = 0
		// (RSx+r*RDx)^2 + (RSy....
		// RSx^2 + 2*t*RDx + t^2*RDx^2 .... - radius^2 = 0
		//
		// ( -b +- sqrt( b^2 - 4ac ) ) over 2a
		//
		// Actually, we just need the determinant.  Is b^2-4ac positive?
		//  ... also RDx^2 + RDy^2 + RDz^2 = 1 so A = 1...
		//
		//After some sligh of hand you can reduce it to...
		//  B = dot(relofs, rayDirection) * 2;
		//  C = relofs * relofs - radius ^2
		//
		// Because we only care about if B*B - 4C
		// We can then drop the 4 from both..  NOTE: Actually we can't but I don't know why.
		//
		//  dot(relofs,rayDirection)^2 - dot(relofs,relofs) - radius^2
		//

		var B = DotArrays( relofs, rayDirection );
		var C = DotArrays( relofs, relofs ) - this.radius*this.radius*4.;
		var hit = (B*B-C)>=0;
		//XXX: TODO: Check to make sure we aren't looking /behind/ us.
		//(make sure we aren't in the sphere + if so, check to see if it's in front or behind)
		if( !hit )
		{
//			cwg.trace( "Miss Sphere." + rayStart + "\n" + this.center + "\n ROFS:" + relofs+ "\n RAD:" + this.radius);
			return null;
		}
//		cwg.trace( "Hit Sphere." + rayStart + "\n" + this.center + "\n ROFS:" + relofs+ "\n RAD:" + this.radius);
//		cwg.trace( "Hit Sphere. ):" + depth );


		//Look through all of our triangles
		for( var i = 0; i < this.verts.length/9; i++ )
		{
			//http://www.devmaster.net/wiki/Ray-triangle_intersection
			var A = [ this.verts[i*9+0], this.verts[i*9+1], this.verts[i*9+2] ];
			var B = [ this.verts[i*9+3], this.verts[i*9+4], this.verts[i*9+5] ];
			var C = [ this.verts[i*9+6], this.verts[i*9+7], this.verts[i*9+8] ];

			var BA = SubArrays( B, A );
			var CA = SubArrays( C, A );

			//Cross product
			var N = Normalize( CrossArrays( BA, CA ) );


			var distance = - DotArrays( SubArrays( rayStart, A ), N ) / DotArrays( rayDirection, N );

			if( distance > 10000 || distance < 0 )
			{
				continue;
			}

			var P = AddArrays( rayStart, ScalarArrays( rayDirection, distance ) );
			var PA = SubArrays( P, A );
			var u = (PA[1]*CA[0] - PA[0]*CA[1])/(BA[1]*CA[0] - BA[0]*CA[1]);
			var v = (PA[1]*BA[0] - PA[0]*BA[1])/(CA[1]*BA[0] - CA[0]*BA[1]);
			var w = 1 - (u + v);

			if( u >= 0 && v >= 0 && w >= 0 )
			{
//				alert( PA + ";\n" + A + ";\n" + BA + ";\n" + CA + "\n" + u + " " + v + " " + w + 
//					"\n" + P[1]*C[0] + " - " + P[0]*C[1] );
				//We have a collision
				var hit = new Object();
				hit.distance = distance;
				hit.position = P;
				hit.tag = this.tags[i];
				hit.uvw = [ u, v, w ];
				hit.normal = N;
				ret.push( hit );
//				cwg.trace( hit.distance + " (" + hit.position +") " + hit.normal );
			}
		}

		//Now, check all children.
		for( var i in this.children )
		{
//			depth++;
			var r = this.children[i].traceRay( rayStart, rayDirection );
//			depth--;
			if (r != null) ret = ret.concat( r );
		}

		return ret;
	}
}


