/* CNWebGL.js
 *
 * Copyright (C) 2010 Charles Lohr, All Rights Reserved
 *
 * My first WebGL Scenegraph.  This toolset is modeled after a mixture of
 * the Mercury 2 Game Engine and a variety of other tools.  I am a C programmer,
 * so it has that feel to it.
 *
 * PORTIONS
 *
 * Copyright (C) 2009 Apple Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE. 
 */


function CNWebGL(canvas, attribs, fpscounter)
{
	this.gl = canvas.getContext("experimental-webgl");
	if (this.gl == null)
	{
		alert("No WebGL context in: " + canvas );
		return null;
	}

	this.fpscount = fpscounter;
	this.frames_since_count = 0;

	if( this.fpscount != null )
	{
		this.fpscount.innerHTML = "FPS: ?";

		var cwg = this;
		setInterval( function()
		{
			cwg.fpscount.innerHTML = "FPS: " + cwg.frames_since_count;
			cwg.frames_since_count = 0;
		}, 1000 );
	}

	this.fDtime = 0;
	this.stateset = new Object();
	this.root = new CNGLCreateNode(this);
	this.canvas = canvas;
	this.Draw = Draw;
	this.width = 200;	//Will get changed after first frame
	this.height = 200;	//Same
	this.marginx = 30;
	this.marginy = 50;
	this.assetstack = [];
	this.trace = function( str ){ };
	this.uniforms = [];
	this.attribs = attribs;
	this.shadervars = [];
	this.currentshader = null;
	this.activetextures = [];
	this.overridefull = false;

	this.uniforms["ModelViewMatrix"] = new CreateUniformMatrix("ModelViewMatrix",this);
	this.uniforms["PerspectiveMatrix"] = new CreateUniformMatrix("PerspectiveMatrix",this);
	this.uniforms["MVPMatrix"] = new CreateUniformMatrix("MVPMatrix",this);
	this.uniforms["NormalMatrix"] = new CreateUniformMatrix("NormalMatrix",this);

	this.gl.clearColor(.1,.1,.2,1.0);
	this.gl.clearDepth(10000);

	//At least try to get floating point textures
	this.gl.getExtension( "OES_texture_float" );

	this.resizecallback = function( w, h ) { }
}

function Draw( )
{
//	For if your canvas is inside a table.
//	var mtc = document.getElementById( "maintablecontainer" );
//	var mtch = document.getElementById( "maintablecontainerheight" );
//	mtc.width = window.innerWidth - 30;
//	mtch.height = window.innerHeight - 30;

	var canvastable = document.getElementById( "canvastablearea" );

	if( this.overridefull )
	{
		var w = Math.floor(window.innerWidth);
		var h = Math.floor(window.innerHeight);

		this.canvas.width = w;
		this.canvas.height = h;

		gl = this.gl;

		if (this.canvas.width != this.width || this.canvas.height != this.height)
		{
			this.width = this.canvas.width;
			this.height = this.canvas.height;
			this.resizecallback( this.width, this.height );
		}
	}
	else
	{
		var w = Math.floor(window.innerWidth - this.marginx);
		var h = Math.floor(window.innerHeight - this.marginy);

		this.canvas.width = w;
		this.canvas.height = h;

		gl = this.gl;

		if (this.canvas.width != this.width || this.canvas.height != this.height)
		{
			this.width = this.canvas.width;
			this.height = this.canvas.height;
			this.resizecallback( this.width, this.height );
		}
	}

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	this.root.render();

        gl.flush();
	this.frames_since_count++;
}

//Utility Functions
//Get file from internet
function LoadFromURI(uri, successfunction, failfunction, obj)
{
	var req = new XMLHttpRequest();
	req.obj = obj;
	req.onreadystatechange = function (event) {
		if( req.readyState == 4 && successfunction != null )
		{
			successfunction( req.obj, req.responseText, req );
		}
	};
	req.open("GET", uri, true);

	try
	{
		req.send();
	}
	catch( e )
	{
		cwg.trace("Failed to get: " + uri + " ("+e+")" );
		if( failfunction != null )
			failfunction( req.obj, req );
	}
	return;
}


//Uniform Functions
function CreateUniformMatrix( _name, cng )
{
	this._name = _name;
	this.value = new J3DIMatrix4(); 
	this.cngl = cng;
	this.update = function() 
	{
		var pid = this.cngl.gl.getUniformLocation(this.cngl.currentshader.Program, this._name );
		if( pid != null )
		{
			this.cngl.gl.uniformMatrix4fv( pid, false, this.value.getAsArray() );
		}
	}
}

function CreateUniformFloat4( _name, cng )
{
	this._name = _name;
	this.x = 0;
	this.y = 0;
	this.z = 0;
	this.w = 0;
	this.cngl = cng;
	this.update = function() 
	{
		var pid = this.cngl.gl.getUniformLocation(this.cngl.currentshader.Program, this._name );
		if( pid != null )
		{
			this.cngl.gl.uniform4f( pid, this.x, this.y, this.z, this.w );
		}
	}
}



function CNGLCreateAsset( cngl, lname )
{
	this._name = lname;
	this._type = "Asset";

	if( cngl.assetstack[this._type] == null )
		cngl.assetstack[this._type] = [];

	this.render = function() {
		cngl.assetstack[this._type].push( this );
		this.activate();
	};

	this.unrender = function() {
		ThisAS = cngl.assetstack[this._type];
		if( this.deactivate != null )
		{
			this.deactivate();
		}
		ThisAS.pop();
		var last = ThisAS.pop();
		if( last != null )
		{	
			ThisAS.push(last);
			last.activate();
		}
	};

	this.activate = function() { };
	this.deactivate = function() { };
	this.cngl = cngl;
}

function CNGLCreateEnableTex2DAsset( cngl, lname )
{
	CNGLCreateAsset.call( this, cngl, lname );
	this._type = "EnableTex2DAsset"
	if( cngl.assetstack[this._type] == null )
		cngl.assetstack[this._type] = [];

	this.activate = function()
	{
	        gl.enable(gl.TEXTURE_2D);
		gl.activeTexture(gl.TEXTURE0);
	}
	this.deactivate = function()
	{
	        gl.disable(gl.TEXTURE_2D);
	}
}

function CNGLCreateTextureAsset( cngl, lname )
{
	CNGLCreateAsset.call( this, cngl, lname );
	this._type = "TextureAsset";
	if( cngl.assetstack[this._type] == null )
		cngl.assetstack[this._type] = [];

	this.texture = null;
	this.textureloc = 0;

	this.load = function( addr )
	{
		this.texture = this.cngl.gl.createTexture();
		this.texture.image = new Image();
		this.texture.image.asset = this;
		this.texture.image.onload = function()
		{
			var gl = this.asset.cngl.gl;
			this.asset.cngl.trace( this.asset._name+": Loaded: " + this.src );
			gl.bindTexture(gl.TEXTURE_2D, this.asset.texture);
			gl.texImage2D(
				gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.asset.texture.image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
//			gl.generateMipmap( gl.TEXTURE_2D );
			gl.bindTexture(gl.TEXTURE_2D, null);
		};
		this.texture.image.src = addr;
		this.cngl.trace( this._name + ": Loading: " + addr );
	}

	this.activate = function()
	{
		var gl = this.cngl.gl;
		gl.activeTexture(gl.TEXTURE0 + this.textureloc);
	        gl.bindTexture(gl.TEXTURE_2D, this.texture);
		this.cngl.activetextures[this.textureloc] = this;
	}
	this.deactivate = function()
	{
		var gl = this.cngl.gl;
		gl.activeTexture(gl.TEXTURE0 + this.textureloc);
	        gl.bindTexture(gl.TEXTURE_2D, null );
		//this.cngl.activetextures[this.textureloc] = null;
	}
}

function CNGLCreate2DDataTexture( cngl, lname )
{
	CNGLCreateAsset.call( this, cngl, lname );
	this._type = "Texture2DAsset";
	if( cngl.assetstack[this._type] == null )
		cngl.assetstack[this._type] = [];

	this.texture = null;
	this.textureloc = 0;

	this.destroy = function()
	{
		this.cngl.gl.deleteTexture( this.texture );
	}

	this.create = function( x, y, buffer, format, dtype )
	{
		var gl = this.cngl.gl;

		if( this.texture )
			this.destroy();

		this.texture = gl.createTexture();


		if( dtype == gl.FLOAT )
		{
			if (!gl.getExtension('OES_texture_float'))
			{
				console.log( "OES_texture_float not supported.\n" );
			} 
		}


		gl.bindTexture(gl.TEXTURE_2D, this.texture);

//		gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, x, y, 0, gl.RGBA, gl.UNSIGNED_BYTE ,buffer )
		gl.texImage2D( gl.TEXTURE_2D, 0, format,  x, y, 0, format,  dtype, buffer );

//		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.bindTexture(gl.TEXTURE_2D, null);

	}

	this.activate = function()
	{
		var gl = this.cngl.gl;
		gl.activeTexture(gl.TEXTURE0 + this.textureloc);
	        gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.activeTexture(gl.TEXTURE0);
		this.cngl.activetextures[this.textureloc] = this;
	}
	this.deactivate = function()
	{
		var gl = this.cngl.gl;
		gl.activeTexture(gl.TEXTURE0 + this.textureloc);
	        gl.bindTexture(gl.TEXTURE_2D, null );
//		this.cngl.activetextures[this.textureloc] = null;
	}
}

function CNGLCreateShaderAsset( cngl, lname )
{
	CNGLCreateAsset.call( this, cngl, lname );

	this._type = "ShaderAsset";
	if( cngl.assetstack[this._type] == null )
		cngl.assetstack[this._type] = [];


	this.GetObjectSource = function( object )
	{
		console.log( object );
		var shaderobj = document.getElementById(object);
		if( shaderobj == null )
		{
			this.cngl.trace( "Could not open shader: " + object + " - trying to load from file." );

			var xtreq = new XMLHttpRequest;
			xtreq.open( "get", object, false );
			xtreq.send(null);
			if( xtreq.status != 200 )
			{
				this.cngl.trace( "Fatal problem.  Cannot find shader: " + object + "." );
				return null;
			}
			return xtreq.responseText;
		}
		return shaderobj.text;
	}
	this.LoadShaderObject = function( names, sources, shader_type )
	{
		var gl = this.cngl.gl;
		var shader = gl.createShader(shader_type);
		if (shader == null)
		{
			this.cngl.trace("Couldn't create shader " + shader_type + "." );
			return null;
		}

		gl.shaderSource(shader, sources);
		gl.compileShader(shader);

		var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (!success)
		{
			var error = gl.getShaderInfoLog(shader);
			this.cngl.trace("Error compiling shader '"+names+"':\n"+error);
			gl.deleteShader(shader);
			return null;
		}
		return shader;
	}

	this.loadshaders = function( vert, frag, vertname, fragname )
	{
		var gl = this.cngl.gl;
		this.VertexShader = this.LoadShaderObject( vertname,vert, gl.VERTEX_SHADER );
		this.FragmentShader = this.LoadShaderObject( fragname,frag, gl.FRAGMENT_SHADER );

		if( this.VertexShader == null || this.FragmentShader == null )
		{
			if( this.VertexShader == null )
				this.cngl.trace("Error linking shader; Vertex Shader failed.");
			else if( this.FragmentShader == null )
				this.cngl.trace("Error linking shader; Fragment Shader failed.");
			this.FragmentShader = null;
			this.VertexShader = null;
			return false;
		}
		this.Program = gl.createProgram();

		if (!this.Program)
		{
			this.cngl.trace("Could not create shader program");
			this.Program = null;
			this.FragmentShader = null;
			this.VertexShader = null;
			return false;
		}

		gl.attachShader( this.Program, this.VertexShader );
		gl.attachShader( this.Program, this.FragmentShader );

		for (var i in this.cngl.attribs)
		{
			gl.bindAttribLocation( this.Program, i, this.cngl.attribs[i] );
		}

		gl.linkProgram(this.Program);

		var linked = gl.getProgramParameter(this.Program, gl.LINK_STATUS);
		if( !linked )
		{
			// something went wrong with the link
			var error = gl.getProgramInfoLog (this.Program);
			this.cngl.trace("Could not link "+ this._name +".\nError: " + error );

			try {
				gl.deleteProgram(this.Program);
				gl.deleteProgram(this.FragmentShader);
				gl.deleteProgram(this.VertexShader);
			}
			catch( e ) { } 
			this.Program = null;
			this.FragmentShader = null;
			this.VertexShader = null;
			return false;
		}
		this.cngl.trace("Successfully linked "+ this._name );
		return true;
	}

	this.loadobjs = function( vert, frag )
	{
		return this.loadshaders( this.GetObjectSource(vert),this.GetObjectSource(frag),vert,frag );
	}

	this.activate = function()
	{
		this.cngl.gl.useProgram(this.Program);
		this.cngl.currentshader = this;

/*
		for( k = 0; k < 10; k++ )
		{
			
			var ret = this.cngl.gl.getActiveUniform(this.Program, k );
			if( ret != null )
				this.cngl.trace(k +":" + ret.name + "/" + ret.type );
		}
*/

		for( var i = 0; i < 8; i++ )
		{
			var vv = this.cngl.activetextures[i];
			if( vv )
			{
				var vvname = vv._name;
				var pid = this.cngl.gl.getUniformLocation(this.cngl.currentshader.Program, vvname );
				if( pid != null )
				{
					//console.log( pid, i, vvname, this.cngl.currentshader.Program );
					this.cngl.gl.uniform1i( pid, i );
				}
			}
		}
		for( var c in this.cngl.uniforms )
		{
			this.cngl.uniforms[c].update();
		}


	}
	this.deactivate = function()
	{
		this.cngl.gl.useProgram(null);
		this.cngl.currentshader = null;
	}
}







function CNGLCreateNode( cngl, lname )
{
	this._name = lname;
	this._type = "Node";
	this.render = function() {
		for( var c in this.assets )
		{
			this.assets[c].render();
		}

		for( var c in this.children )
		{
			this.children[c].render();
		}

		for( var c in this.assets )
		{
			this.assets[c].unrender();
		}
	};

	this.cngl = cngl;
	this.children = new Array();
	this.assets = [];
}

function CNGLCreatePerspectiveNode( cngl, lname )
{
	CNGLCreateNode.call( this, cngl, lname );
	this._type = "PerspectiveNode";
	this.CPNodebaserender = this.render;

	this.eye = [0.0, 0.0, 7.0];
	this.at = [0.0, 0.0, 0.0];
	this.up = [0.0, 1.0, 0.0];
	this.near = 1;
	this.far = 10000;
	this.angle = 45;

	this.clearonstart = false;
	this.overridex = null;
	this.overridey = null;

	this.render = function()
	{
		var cngl = this.cngl;
		var gl = cngl.gl;
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		cngl.uniforms["PerspectiveMatrix"].value.makeIdentity();
		var w = 0;
		var h = 0;
		if( this.overridex != null )
			w = this.overridex;
		else
			w = cngl.width;

		if( this.overridey != null )
			h = this.overridey;
		else
			h = cngl.height;

		gl.viewport(0, 0, w,h);
		cngl.uniforms["PerspectiveMatrix"].value.perspective(this.angle, w/h, this.near, this.far);
		cngl.uniforms["PerspectiveMatrix"].value.lookat(this.eye[0], this.eye[1], this.eye[2], 
			this.at[0], this.at[1], this.at[2], this.up[0], this.up[1], this.up[2]);

		cngl.uniforms["ModelViewMatrix"].value.makeIdentity();

		cngl.uniforms["NormalMatrix"].value.load(cngl.uniforms["ModelViewMatrix"].value);
		cngl.uniforms["NormalMatrix"].value.invert();
		cngl.uniforms["NormalMatrix"].value.transpose();

		cngl.uniforms["MVPMatrix"].value.load(cngl.uniforms["PerspectiveMatrix"].value);
		cngl.uniforms["MVPMatrix"].value.multiply(cngl.uniforms["ModelViewMatrix"].value);

		if( this.clearonstart )
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		this.CPNodebaserender();
	};

}

function CNGLCreateOrthographicNode( cngl, lname )
{
	CNGLCreateNode.call( this, cngl, lname );
	this._type = "PerspectiveNode";
	this.CPNodebaserender = this.render;

	//determines what the corners of the screen are.
	//If true, 0,0 is top left; screen.x, screen.y is bottom right.
	this.isScreenRes = false;

	this.render = function()
	{
		var cngl = this.cngl;
		var gl = cngl.gl;
		gl.disable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		gl.viewport(0, 0, cngl.width, cngl.height);
		cngl.uniforms["PerspectiveMatrix"].value.makeIdentity();
		if( this.isScreenRes )
		{
			cngl.uniforms["PerspectiveMatrix"].value.ortho( 
				0., cngl.width,
				cngl.height, 0.,
				-1, 1 );
		}
		else
		{
			cngl.uniforms["PerspectiveMatrix"].value.ortho( 
				-1, 1,
				-1, 1,
				-1, 1 );
		}

		cngl.uniforms["ModelViewMatrix"].value.makeIdentity();

		cngl.uniforms["NormalMatrix"].value.load(cngl.uniforms["ModelViewMatrix"].value);
		cngl.uniforms["NormalMatrix"].value.invert();
		cngl.uniforms["NormalMatrix"].value.transpose();

		cngl.uniforms["MVPMatrix"].value.load(cngl.uniforms["PerspectiveMatrix"].value);
		cngl.uniforms["MVPMatrix"].value.multiply(cngl.uniforms["ModelViewMatrix"].value);
		this.CPNodebaserender();
	};

}

function CNGLCreateRBNode( cngl, lname )
{
	CNGLCreateNode.call( this, cngl, lname );
	this._type = "RBNode";
	this.RBNodebaserender = this.render;
	this.oglTexture = null;

	this.breakdown = function()
	{
		var gl = this.cngl.gl;
//		gl.bindRenderbuffer( gl.RENDERBUFFER, this.Renderbuffer );
//		gl.deleteFramebuffer( this.Framebuffer );
//		gl.bindRenderbuffer( gl.RENDERBUFFER, null );
//		gl.deleteRenderbuffer( this.Renderbuffer );
//		this.Renderbuffer = null;
	}

//XXX TODO IN PROGRESS
	//Pass an existing set of textures in.

	// format = gl.RGBA, type = gl.UNSIGNED_BYTE,
	this.setup = function( texture, sizex, sizey, format, type )
	{
		var gl = this.cngl.gl;
		if( this.Framebuffer != null )
			gl.deleteFramebuffer( this.Framebuffer );
		this.Framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.Framebuffer );
		this.width = sizex;
		this.height = sizey;
		this.Framebuffer.width = sizex;
		this.Framebuffer.height = sizey;

		if( texture.texture != null )
		{
			gl.deleteTexture( texture.texture );
		}
		texture.texture = gl.createTexture();
		this.oglTexture = texture.texture;

		gl.bindTexture( gl.TEXTURE_2D, texture.texture );
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


		//http://learningwebgl.com/lessons/lesson16/
		try {
			// Do it the way the spec requires
			gl.texImage2D(gl.TEXTURE_2D, 0, format, this.width, this.height, 0, format, type, null);
		} catch (exception) {
			// Workaround for what appears to be a Minefield bug.
			var textureStorage = new WebGLUnsignedByteArray(this.width * this.height * 4);
			gl.texImage2D(gl.TEXTURE_2D, 0, format, this.width, this.height, 0, format, type, textureStorage);
		}


		if( this.Renderbuffer != null )
			gl.deleteRenderbuffer( this.Renderbuffer );
		this.Renderbuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer( gl.RENDERBUFFER, this.Renderbuffer );
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.Renderbuffer );

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);


	}

	this.render = function()
	{
		var gl = this.cngl.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.Framebuffer);

		var thiswidth = this.cngl.width;
		var thisheight = this.cngl.height;

		this.cngl.width = this.width;
		this.cngl.height = this.height;

		 var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		    switch (status) {
			case gl.FRAMEBUFFER_COMPLETE:
			    break;
			case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
			    this.cngl.trace("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
			    break;
			case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
			    this.cngl.trace("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
			    break;
			case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
			    this.cngl.trace("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
			    break;
			case gl.FRAMEBUFFER_UNSUPPORTED:
			    this.cngl.trace("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
			    break;
			default:
			    this.cngl.trace("Incomplete framebuffer: " + status);
		    }


		gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

		this.RBNodebaserender();

		this.cngl.width = thiswidth;
		this.cngl.height = thisheight;

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	};
}

function CNGLCreateTransformNode( cngl, lname )
{
	CNGLCreateNode.call( this, cngl, lname );
	this._type="TransformNode";
	this.TransformNodebaserender = this.render;

	this.matrix = new J3DIMatrix4();
	this.matrix.makeIdentity();
	this.render = function() {
		var cngl = this.cngl;
	        temp = new J3DIMatrix4();
		var mvMatrix = cngl.uniforms["ModelViewMatrix"].value;
		var nrmMatrix = cngl.uniforms["NormalMatrix"].value;
		var perMatrix = cngl.uniforms["PerspectiveMatrix"].value;
		var mvpMatrix = cngl.uniforms["MVPMatrix"].value;

		temp.load(mvMatrix);

		mvMatrix.multiply(this.matrix);
		cngl.uniforms["ModelViewMatrix"].update();

		nrmMatrix.load(mvMatrix);
		nrmMatrix.invert();
		nrmMatrix.transpose();
		cngl.uniforms["NormalMatrix"].update();

		mvpMatrix.load(perMatrix);
		mvpMatrix.multiply(mvMatrix);
		cngl.uniforms["MVPMatrix"].update();

		this.TransformNodebaserender();

		mvMatrix.load( temp );

		cngl.uniforms["ModelViewMatrix"].update();
	}
}

function CNGLCreateModelNode( cngl, lname )
{
	CNGLCreateNode.call( this, cngl, lname );
	this.ModelNodebaserender = this.render;
	this._type = "ModelNode";
	this.finishVBO = null; //Set to a function to call when the VBO is done

	this.render = function() {
		//This section is from Apple 

	        // Enable all of the vertex attribute arrays.
		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
		gl.enableVertexAttribArray(2);

		// Set up all the vertex attributes for vertices, normals and texCoords
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexObject);
		gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalObject);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordObject);
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);

		// Bind the index array
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexObject);
		// Draw the cube
		gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);

		//End Apple Section

		this.ModelNodebaserender();
	}

	this.MakeFromArrays = function( vertices, normals, texCoords, indices )
	{
		var gl = this.cngl.gl;

/*
console.log( this );
console.log( this.cngl );
console.log( this.cngl.gl );
*/
		if( this.normalObject ) gl.deleteBuffer( this.normalObject );

		this.normalObject = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.normalObject);
		gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

		if( this.texCoordObject ) gl.deleteBuffer( this.texCoordObject );

		this.texCoordObject = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordObject);
		gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

		if( this.vertexObject ) gl.deleteBuffer( this.vertexObject );

		this.vertexObject = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexObject);
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

		gl.bindBuffer(this.ARRAY_BUFFER, null);

		if( this.indexObject ) gl.deleteBuffer( this.indexObject );

		this.indexObject = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexObject);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		this.numIndices = indices.length;

		if( this.finishVBO != null ) this.finishVBO( this );
		//Done with the apple section

	}
}

function CNGLCreateBoxNode( cngl, lname )
{
	CNGLCreateModelNode.call( this, cngl, lname );
	this._type = "BoxNode";

	//This is from Apple.
	// box
	//    v6----- v5
	//   /|      /|
	//  v1------v0|
	//  | |     | |
	//  | |v7---|-|v4
	//  |/      |/
	//  v2------v3

	this.vertices = new Float32Array(
		[  1, 1, 1,  -1, 1, 1,  -1,-1, 1,   1,-1, 1,    // v0-v1-v2-v3 front
		   1, 1, 1,   1,-1, 1,   1,-1,-1,   1, 1,-1,    // v0-v3-v4-v5 right
		   1, 1, 1,   1, 1,-1,  -1, 1,-1,  -1, 1, 1,    // v0-v5-v6-v1 top
		  -1, 1, 1,  -1, 1,-1,  -1,-1,-1,  -1,-1, 1,    // v1-v6-v7-v2 left
		  -1,-1,-1,   1,-1,-1,   1,-1, 1,  -1,-1, 1,    // v7-v4-v3-v2 bottom
		   1,-1,-1,  -1,-1,-1,  -1, 1,-1,   1, 1,-1 ]   // v4-v7-v6-v5 back
	);

	// normal array
	this.normals = new Float32Array(
		[  0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,     // v0-v1-v2-v3 front
		   1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,     // v0-v3-v4-v5 right
		   0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,     // v0-v5-v6-v1 top
		  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,     // v1-v6-v7-v2 left
		   0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,     // v7-v4-v3-v2 bottom
		   0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1 ]    // v4-v7-v6-v5 back
	);


	// texCoord array
	this.texCoords = new Float32Array(
		[  1, 1,   0, 1,   0, 0,   1, 0,    // v0-v1-v2-v3 front
		   0, 1,   0, 0,   1, 0,   1, 1,    // v0-v3-v4-v5 right
		   1, 0,   1, 1,   0, 1,   0, 0,    // v0-v5-v6-v1 top
		   1, 1,   0, 1,   0, 0,   1, 0,    // v1-v6-v7-v2 left
		   0, 0,   1, 0,   1, 1,   0, 1,    // v7-v4-v3-v2 bottom
		   0, 0,   1, 0,   1, 1,   0, 1 ]   // v4-v7-v6-v5 back
	);

	// index array
	this.indices = new Uint16Array(
		[  0, 1, 2,   0, 2, 3,    // front
		   4, 5, 6,   4, 6, 7,    // right
		   8, 9,10,   8,10,11,    // top
		  12,13,14,  12,14,15,    // left
		  16,17,18,  16,18,19,    // bottom
		  20,21,22,  20,22,23 ]   // back
	);

	this.MakeFromArrays( this.vertices, this.normals, this.texCoords, this.indices );
}

function CNGLCreateSquareNode( cngl, lname )
{
	CNGLCreateModelNode.call( this, cngl, lname );
	this._type = "SquareNode";

	this.vertices = new Float32Array(
		[  0, 0, 0,   1, 0, 0,   1, 1, 0,   0, 1, 0 ]
	);

	// normal array
	this.normals = new Float32Array(
		[  0, 0, 1,   0, 0, 1,  0, 0, 1,   0, 0, 1 ]
	);


	// texCoord array
	this.texCoords = new Float32Array(
		[  0, 0,   1, 0,   1, 1,   0, 1 ]
	);

	// index array
	this.indices = new Uint16Array(
		[  0, 1, 2,   0, 2, 3  ]
	);

	this.MakeFromArrays( this.vertices, this.normals, this.texCoords, this.indices );
}


function CNGLCreateLoadableModelNode( cngl, lname )
{
	CNGLCreateBoxNode.call( this, cngl, lname );
	this._type = "ModelNode";

	this.LoadOBJModelURI = function( uri )
	{
		LoadFromURI( uri, function( obj, text ) { obj.LoadOBJModelText( text ); }, null, this );
	}
	this.LoadOBJModelText = function( objtext )
	{
		try{

		var outvert = [];
		var outnrm = [];
		var outtc = [];
		var outind = [];

		var verts = [];
		var nrms = [];
		var tc = [];
		var ind = [];

		var lines = objtext.split("\n");

		var faceno = 0;

		for (var lineno in lines) {
			var line = lines[lineno].replace(/[ \t]+/g, " ").replace(/\s\s*$/, "");	//From apple's suggestion in J3DI.
			var elems = line.split(" ");

			if( elems[0] == "v" )
			{
				verts.push(parseFloat(elems[1]));
				verts.push(parseFloat(elems[2]));
				verts.push(parseFloat(elems[3]));
//				this.cngl.trace( "V1(" + verts.length + "): " +parseFloat(elems[1])+"," + parseFloat(elems[2])+ "," + parseFloat(elems[3]) );
			}
			else if( elems[0] == "vt" )
			{
				tc.push(parseFloat(elems[1]));
				tc.push(parseFloat(elems[2]));
			}
			else if( elems[0] == "vn" )
			{
				nrms.push(parseFloat(elems[1]));
				nrms.push(parseFloat(elems[2]));
				nrms.push(parseFloat(elems[3]));
			}
			else if( elems[0] == "f" )
			{
				var vals = [];
				vals.push( elems[1].split("/") );
				vals.push( elems[2].split("/") );
				vals.push( elems[3].split("/") );

				//Yuck - sparse - this is sort of correct, but very slow.
				for( var i = 0; i < 3; i++ )
				{
					var v = parseInt(vals[i][0])-1;
					var t = parseInt(vals[i][1])-1;
					var n = parseInt(vals[i][2])-1; //we're zero indexed OBJ is one indexed.

					outvert.push( verts[v*3+0] );
					outvert.push( verts[v*3+1] );
					outvert.push( verts[v*3+2] );

					outtc.push( tc[t*2+0] );
					outtc.push( tc[t*2+1] );

					outnrm.push( nrms[n*3+0] );
					outnrm.push( nrms[n*3+1] );
					outnrm.push( nrms[n*3+2] );

					outind.push( faceno * 3 + i );
				}
				faceno++;

//				if( outind.length > 65500 ) break;
			}
		}

		this.vertices = new Float32Array( outvert );
		this.normals = new Float32Array( outnrm );
		this.texCoords = new Float32Array( outtc );
		this.indices = new Uint16Array( outind );

		this.MakeFromArrays( this.vertices, this.normals, this.texCoords, this.indices );
		this.cngl.trace( "Model " + this._name + " loaded." );
		} catch (e) { alert( e ); }
	}
};

function CNGLCreateQuadNode( cngl, lname )
{
	CNGLCreateModelNode.call( this, cngl, lname );
	this._type = "QuadNode";

	this.vertices = new Float32Array( [ 1, 1, 1,   -1, 1, 1,    -1,-1, 1,   1,-1, 1 ] );
	this.normals = new Float32Array( [  0, 0, 1,    0, 0, 1,     0, 0, 1,   0, 0, 1 ] );
	this.texCoords = new Float32Array( [   1, 1,       0, 1,        0, 0,      1, 0 ] );
	this.indices = new Uint16Array(   [  0, 1, 2,   0, 2, 3 ] );

	this.MakeFromArrays( this.vertices, this.normals, this.texCoords, this.indices );
}

