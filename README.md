# Voxeltastic!

Ever need to ray trace your 3D images in some way that's more interested than slices?  Don't want hard surfaces?  Wanna do it in a web browser for the world to see?  Try Voxeltastic!  It's a A WebGL-based Raytraced Voxel Engine with Transparency.  If you'd like a brief summary of what the default interface is, please click this link:

https://www.youtube.com/watch?v=aqqEYz38ens

The default data set is the wifi signal over a 360mm x 360mm x 180mm area.  The density goes from 0 to 255.  You can specify the range for what is considered "transparent" to "opaque" along with minor changes to the colors.  If you specify Clear to be 0 and Opaque to be 255, areas with poor signal strength will not be visible, and areas with high signal strength will be solid.  If you invert these two, then areas with poor signal strength will be solid, while good signal strength will be invisible.

You can play with this data set on the URL listed here: https://cnlohr.github.io/voxeltastic/

# Structure

Voxeltastic is a few .js files that are either javascript or WebGL shaders.  They are strung together with the index.html and an HTML5 canvas running WebGL to display to you a wonderful raytraced image.  By game.js has its settings at the top and by default, it loads a 64x64x32, 8-bit chunk called densities.dat.  The colors are selected based on the RGBtoHSV function, and the rendering is done on a full-screen quad that's running frag-pass1.js.  The voxel-stepping engine is actually the same one used in my No Euclid! project, found here: https://github.com/cnlohr/noeuclid - Just significantly stripped down.
