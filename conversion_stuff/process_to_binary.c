//Only for personal use.  Not intended for medical diagnosis or anything else.

//THIS SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
//SOFTWARE.

//Don't forget to do the following:
//for f in o* ; do dcmj2pnm +opw $f ../test/$f.pnm ; done
//mogrify -brightness-contrast -3x95 *
//
//Then organize your files in numerical order.

#include <stdio.h>
#include <stdlib.h>
#include <arpa/inet.h>
#include <stdint.h>
#include <string.h>

uint16_t * block;
uint8_t * blockout;

int main( int argc, char ** argv )
{
	int i;

	int z = (argc-1);
	for( i = 0; i < 32; i++ )  //Round up power of 2.
	{
		if( ( 1<<i ) >= z ) { z = 1<<i; break; }
	}
	int x, y;

	for( i = 1; i < argc; i++ )
	{
		char fmt[128];
		int depth;
		printf( "Reading: %s\n", argv[i] );
		FILE * f = fopen( argv[i], "rb" );
		fscanf( f, "%127s\n", fmt );
		fscanf( f, "%d %d\n", &x, &y );
		fscanf( f, "%d\n", &depth );
		if( x == 0 || y == 0 ) { fprintf( stderr, "Error: cannot open %s\n", argv[i] ); exit( 6 ); }
		if( depth != 65535 ) { fprintf( stderr, "Error: depth not valid.\n" ); exit( 7 ); }
		if( !block ) block = malloc( x * y * z * 2 );
		int r = fread( &block[(i-1)*x*y], x, y*2, f );
		printf( "Read %d rows\n", r );
		fclose( f );
	}
	printf( "Read done.  (%d,%d,%d)\n", x, y, z );

	int ox = 128;
	int oy = 128;
	int oz = 32;

	blockout = malloc( ox * oy * oz);
	int xy = x * y;
	int oxy = ox * oy;
	int tx, ty, tz;
	int max=  0;
	int min = 1000000;

	for( tz = 0; tz < oz; tz++ )
	for( ty = 0; ty < oy; ty++ )
	for( tx = 0; tx < ox; tx++ )
	{
		int sstot = 0;
		int ssx = x / ox, ssy = y / oy, ssz = z/oz;
		int sx, sy, sz;

		for( sz = 0; sz < ssz; sz++ )
		for( sy = 0; sy < ssy; sy++ )
		for( sx = 0; sx < ssx; sx++ )
		{
			sstot += htons( block[(tx*ssx+sx)+(ty*ssy+sy)*x+(tz*ssz+sz)*xy] );
		}
		int v = sstot / (ssz*ssy*ssx);

		if( v < min ) min = v;
		if( v > max ) max = v;
		blockout[tx+ty*ox+tz*oxy] = (v-6778)/140;
	}

	free( block );
	uint8_t * finalblockout = malloc( ox * oy * oz );
	memset( finalblockout, 0xff, ox*oy*oz );
	//Transpose X/Z
	int fox = oz;
	int foy = oy;
	int foz = ox;
	for( tz = 0; tz < oz; tz++ )
	for( ty = 0; ty < oy; ty++ )
	for( tx = 0; tx < ox; tx++ )
	{
		//finalblockout[tz+ty*oz+tx*oy*oz] = blockout[tx+ty*ox+tz*oxy];
		//printf( "%d %d %d -> %d (%d+%d*%d+%d*%d*%d)\n", tx, ty, tz, tz+ty*foy+tx*fox*foy,tz,ty,foy,tx,fox,foy );
		finalblockout[tz+ty*fox+tx*fox*foy] = blockout[tx+ty*ox+tz*oxy];
	}

	printf( "MIN: %d / MAX: %d\n",min, max );
	//free( block );
	FILE * fBinary = fopen( "data.bin", "wb" );
	fwrite( finalblockout, ox, oy*oz, fBinary );
	fclose( fBinary );
	printf( "Final sizes: %d, %d, %d\n", fox, foy, foz );
}

