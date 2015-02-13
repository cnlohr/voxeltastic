
var MAPX = 64;
var MAPY = 64;
var MAPZ = 32;

var distto = 60;
var rotx, roty;
var rotspeedx, rotspeedy;

rotspeedx = .4;
rotspeedy = 0;
rotx = 0;
roty = 1.0;
var mdown = false;
var lastdx = 0;
var lastdy = 0;

var actualtime = 0;
var lastmovetime = 0;

var RFBSubset;

var RFDir;

function UpdateMap()
{
	var lastdebug;

	var DoProgressiveSubTex = true;

	lastdebug = [0,0];

	//cwg.gl.flush();
	//cwg.gl.finish();
}






function HSVtoRGB( hue, sat, value )
{

	var pr = 0;
	var pg = 0;
	var pb = 0;

	var ora = 0;
	var og = 0;
	var ob = 0;

	var ro = ( hue * 6 ) % 6.0;

	var avg = 0;

	ro = (ro + 6 + 1) % 6; //Hue was 60* off...

	if( ro < 1 ) //yellow->red
	{
		pr = 1;
		pg = 1. - ro;
	} else if( ro < 2 )
	{
		pr = 1;
		pb = ro - 1.;
	} else if( ro < 3 )
	{
		pr = 3. - ro;
		pb = 1;
	} else if( ro < 4 )
	{
		pb = 1;
		pg = ro - 3;
	} else if( ro < 5 )
	{
		pb = 5 - ro;
		pg = 1;
	} else
	{
		pg = 1;
		pr = ro - 5;
	}

	//Actually, above math is backwards, oops!
	pr *= value;
	pg *= value;
	pb *= value;

	avg += pr;
	avg += pg;
	avg += pb;

	pr = pr * sat + avg * (1.-sat);
	pg = pg * sat + avg * (1.-sat);
	pb = pb * sat + avg * (1.-sat);

	var reto = new Object;
	reto.r = pr;
	reto.g = pg;
	reto.b = pb;

	return reto;
}



//TRICKY! Should we set up a larger buffer, then trace all objects at once?
function SetupSubsetRT()
{
	RFBCore = new CNGLCreateRBNode( cwg, "rfb_type" );
	var rfbTexture = new CNGLCreate2DDataTexture( cwg, "rfb_tex" );
	myrfb.setup( rfbTexture, 32, 1, cwg.gl.RGBA, cwg.gl.FLOAT  );

	RFDir = new Float32Array( 32*4 );
	var vpp = 0;

	for( var u = -0.7853975; u+= 0.7853975; u < .8 )
	{
		for( var v = 0; v < 6.2; v += 0.7853975 )
		{
			//x
			RFDir[vpp++] = Math.cos( u ) * Math.cos( v );
			RFDir[vpp++] = Math.cos( u ) * Math.sin( v );
			RFDir[vpp++] = Math.sin( u );
			RFDir[vpp++] = 1;
		}
	}

	//Up and Down
	RFDir[vpp++] = 0; 	RFDir[vpp++] = 0;	RFDir[vpp++] = 1; 	RFDir[vpp++] = 1;
	RFDir[vpp++] = 0; 	RFDir[vpp++] = 0;	RFDir[vpp++] =-1; 	RFDir[vpp++] = 1;

	//Spare
	RFDir[vpp++] = 0; 	RFDir[vpp++] = 0;	RFDir[vpp++] = 1; 	RFDir[vpp++] = 1;
	RFDir[vpp++] = 0; 	RFDir[vpp++] = 0;	RFDir[vpp++] =-1; 	RFDir[vpp++] = 1;

}

function UpdateMapRandom()
{
	for( var x = 0; x < MAPX; x++ )
	{
		for( var y = 0; y < MAPY; y++ )
		{
			for( var z = 0; z < MAPZ; z++ )
			{
				dden = Math.random();

				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4] = (dden > .5 )?Math.random()*255:0; 
				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+1] = (dden > .5 )?Math.random()*255:0; 
				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+2] = (dden > .5 )?Math.random()*255:0; 
				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+3] = (dden > .5)?dden*255:0;

//				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+1] = 0;
//				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+2] = 0;
			}
		}
	}
	game.geotex.create( MAPX*MAPY, MAPZ, game.geotex.data, cwg.gl.RGBA, cwg.gl.UNSIGNED_BYTE );

}

function SetupGame()
{
	game.pass1 = new CNGLCreateTransformNode( cwg );
	rootperspective.children.push( game.pass1 );

	game.pass1.geometry = new CNGLCreateSquareNode( cwg, "pass1square" );
	game.pass1.children.push( game.pass1.geometry );
	
	var pass1shader = new CNGLCreateShaderAsset( cwg, "pass1shader" );
	pass1shader.loadobjs( "vert-pass1.js", "frag-pass1.js" );
	game.pass1.assets.push( pass1shader );



	game.dentex = new CNGLCreate2DDataTexture( cwg, "dentex" );
	game.dentex.data = new Uint8Array(256*4);
	game.dentex.textureloc = 1;

	for( var x = 0; x < 256; x++ )
	{
		var rgb = HSVtoRGB( -x / 240.0 + .46, 1, 1 );
		game.dentex.data[x*4] = rgb.r*255;
		game.dentex.data[x*4+1] = rgb.g*255;
		game.dentex.data[x*4+2] = rgb.b*255;
		game.dentex.data[x*4+3] = x;
	}

	game.dentex.create( 256, 1, game.dentex.data, cwg.gl.RGBA, cwg.gl.UNSIGNED_BYTE );
	game.pass1.assets.push( game.dentex );





	game.geotex = new CNGLCreate2DDataTexture( cwg, "geotex" );
	game.geotex.data = new Uint8Array(MAPX * MAPY * MAPZ*4);
	game.geotex.textureloc = 2;

	for( var x = 0; x < MAPX; x++ )
	{
		for( var y = 0; y < MAPY; y++ )
		{
			var z = 0;
			dden = Math.random();

			game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4] = (dden > .5 )?Math.random()*255:0; 
			game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+1] = (dden > .5 )?Math.random()*255:0; 
			game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+2] = (dden > .5 )?Math.random()*255:0; 
			game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+3] = (dden > .5)?dden*255:0;
		}
	}

	game.geotex.create( MAPX*MAPY, MAPZ, game.geotex.data, cwg.gl.RGBA, cwg.gl.UNSIGNED_BYTE );
	game.pass1.assets.push( game.geotex );

	cwg.uniforms["globalinfo"] = new CreateUniformFloat4( "globalinfo", cwg );


	var xtreq = new XMLHttpRequest;
	xtreq.open( "get", "densities.dat", true );
	xtreq.responseType = "arraybuffer";

	xtreq.onload = function( e ) {
		var arrayBuffer = xtreq.response; // Note: not oReq.responseText
		if (arrayBuffer) {
			var byteArray = new Uint8Array(arrayBuffer);
			var index = 0;
			for( var z = 0; z < MAPZ; z++ )
			for( var y = 0; y < MAPY; y++ )
			for( var x = 0; x < MAPX; x++ )
			{
				var v = byteArray[index++];
				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4] = v;
				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+1] = 0;
				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+2] = 0;
				game.geotex.data[(x + y * MAPX + z * MAPX * MAPY)*4+3] = v;
			}
			game.geotex.create( MAPX*MAPY, MAPZ, game.geotex.data, cwg.gl.RGBA, cwg.gl.UNSIGNED_BYTE );
		}
	};

	xtreq.send(null);

//	setTimeout( "UpdateMap()", 1000 );
}


function GameUpdate( deltaTime )
{
	var tt = cwg.uniforms["globalinfo"].x += deltaTime;
	actualtime += tt;

	rotx += rotspeedx * deltaTime;
	roty += rotspeedy * deltaTime;

	if( roty > 1.57 ) roty = 1.57;
	if( roty < -1.57 ) roty = -1.57;
	if( rotx > 3.14159 ) rotx -= -3.14159*2;
	if( rotx < -3.14159 ) rotx += 3.14159*2;


	cwg.uniforms["at"].x = MAPX/2;
	cwg.uniforms["at"].y = MAPY/2;
	cwg.uniforms["at"].z = MAPZ/2;

	cwg.uniforms["eye"].x = Math.cos(rotx)*distto*Math.cos(roty)+cwg.uniforms["at"].x;
	cwg.uniforms["eye"].y = Math.sin(rotx)*distto*Math.cos(roty)+cwg.uniforms["at"].y;
	cwg.uniforms["eye"].z = distto*Math.sin(roty)+cwg.uniforms["at"].z;

	cwg.uniforms["up"].x = 0;
	cwg.uniforms["up"].y = 0;
	cwg.uniforms["up"].z = 1;

	var ar = cwg.width/cwg.height;
	cwg.uniforms["aspect"].x = ar*.6;
	cwg.uniforms["aspect"].y = 0.6;

	var mid = document.getElementById( "mindd" );
	var mxd = document.getElementById( "maxdd" );

	var mi = Number( mid.value );
	var mx = Number( mxd.value );

	for( var x = 0; x < 256; x++ )
	{
		var rgb = HSVtoRGB( -x / 270.0, 1, 1 );
		game.dentex.data[x*4] = rgb.r*255;
		game.dentex.data[x*4+1] = rgb.g*255;
		game.dentex.data[x*4+2] = rgb.b*255;
		var inten = ((x-mi)/(mx-mi));
		if( inten < 0 ) inten = 0;
		if( inten > 1 ) inten = 1;
		game.dentex.data[x*4+3] = inten*255;
	}

	game.dentex.create( 256, 1, game.dentex.data, cwg.gl.RGBA, cwg.gl.UNSIGNED_BYTE );

}

function LMouseButton( down )
{
	if( down )
	{
		rotspeedx = 0;
		rotspeedx = 0;
	}
	else
	{
		if( actualtime - lastmovetime < 200 )
		{
			rotspeedx = lastdx;
			rotspeedy = lastdy;
		}
	}
	mdown = down;
}

function LMovement( x, y, z )
{
	distto += -z*2;
	if( mdown )
	{
		lastdx = -x*.1;
		lastdy = y*.1;
		rotspeedx = 0;
		rotspeedy = 0;
		rotx += lastdx*.05;
		roty += lastdy*.05;
		lastmovetime = actualtime;
	}
}
