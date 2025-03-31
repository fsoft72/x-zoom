document.addEventListener( 'DOMContentLoaded', function () {
	var zoomMe = null;
	var fullscreenView, fullscreenImageContainer, fullscreenImage;
    
    console.log ( "=== X-ZOOM Starting" );

const view = ( () => {
		var dirty = true;             // If true transform matrix needs to update
		var scale = 1;                // current scale
		const matrix = [ 1, 0, 0, 1, 0, 0 ]; // current view transform
		const m = matrix;             // alias
		const pos = { x: 0, y: 0 };   // current position of origin
		const API = {
			applyTo ( element ) {
				dirty && this.update();
				element.style.transform = `matrix(${ m.join( `,` ) })`;
			},
			update () {
				dirty = false;
				m[ 3 ] = m[ 0 ] = scale;
				m[ 2 ] = m[ 1 ] = 0;
				m[ 4 ] = pos.x;
				m[ 5 ] = pos.y;
			},
            // Add this method to directly set the scale
            setScale ( newScale ) {
                scale = newScale;
                dirty = true;
            },
            setPos ( x, y ) {
                // Ensure this sets the position absolutely, not relatively
                // (which it already does)
                pos.x = x;
                pos.y = y;
                dirty = true;
            },
			pan ( amount ) {
				pos.x += amount.x;
				pos.y += amount.y;
				dirty = true;
			},
			scaleAt ( at, amount ) { // at in screen coords
				scale *= amount;
				pos.x = at.x - ( at.x - pos.x ) * amount;
				pos.y = at.y - ( at.y - pos.y ) * amount;
				dirty = true;
			},
			reset () {
				scale = 1;
				pos.x = 0;
				pos.y = 0;
				dirty = true;
				this.update(); // Keep update here for immediate reset effect if needed elsewhere
			}
		};
		return API;
	} )();

	// Check for any images with the 'x-zoom' class and enhance them
	const zoomableImages = document.querySelectorAll( 'img.x-zoom' );

	const createFullScreenView = () => {
		// Create the fullscreen view container if it doesn't exist
		fullscreenView = document.querySelector( '.fullscreen-view' );
		if ( fullscreenView ) return;

		fullscreenView = document.createElement( 'div' );
		fullscreenView.className = 'fullscreen-view';
		fullscreenImageContainer = document.createElement( 'div' );
		fullscreenImageContainer.className = 'fullscreen-image-container';
		fullscreenImage = document.createElement( 'img' );
		fullscreenImage.alt = 'Fullscreen image';
		fullscreenImageContainer.appendChild( fullscreenImage );
		const closeIcon = document.createElement( 'div' );
		closeIcon.className = 'close-icon';
		closeIcon.innerHTML = `
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
				<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
			</svg>
		`;

		// Add separate touch event for the close button to ensure it works on mobile
		closeIcon.addEventListener( 'touchstart', function ( e ) {
			e.stopPropagation(); // Prevent the event from bubbling up
			// remove fullscreenview div

			stopZoom();
		} );

		// Add separate touch event for the close button to ensure it works on mobile
		closeIcon.addEventListener( 'click', function ( e ) {
			e.stopPropagation(); // Prevent the event from bubbling up

			stopZoom();
		} );

		fullscreenView.appendChild( fullscreenImageContainer );
		fullscreenView.appendChild( closeIcon );
		document.body.appendChild( fullscreenView );
	};

	// Process each zoomable image
	zoomableImages.forEach( function ( img ) {
		// Only process if not already in a wrapper
		if ( !img.parentElement.classList.contains( 'image-wrapper' ) ) {
			// Create wrapper
			const wrapper = document.createElement( 'div' );
			wrapper.className = 'image-wrapper';
			// Create magnifier icon
			const magnifier = document.createElement( 'div' );
			magnifier.className = 'magnifier-icon';
			magnifier.innerHTML = `
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
					<path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
				</svg>
			`;
			// Insert the wrapper before the image in the DOM
			img.parentNode.insertBefore( wrapper, img );
			// Move the image into the wrapper and add the magnifier
			wrapper.appendChild( img );
			wrapper.appendChild( magnifier );

			magnifier.addEventListener( 'click', () => startZoom( img ) );
		}
	} );

const startZoom = ( img ) => {
		console.log( "=== START ZOOM: ", img );

		createFullScreenView();

		// Use the clicked image's source for the fullscreen view
		fullscreenImage.src = img.src;
		fullscreenImage.alt = img.alt;

        // --- ADD THIS LINE ---
        fullscreenImage.style.transformOrigin = '0 0';
        // --- END ADD ---

		// Open fullscreen view
		fullscreenView.style.display = 'block';
		zoomMe = fullscreenImage; // Assign to zoomMe *before* onload potentially fires

		// Define onload handler before setting src potentially triggers it immediately from cache
		fullscreenImage.onload = function () {
            console.log("fullscreenImage onload triggered.");
			setInitialZoomScale();
		};
        // Ensure src is set *after* onload is defined, especially for cached images
        // (Though setting it earlier is usually fine, this is safer)
        // fullscreenImage.src = img.src; // Moved up, should be okay, but keep in mind

		// If the image is already loaded/cached, onload might not fire reliably
        // Call setInitialZoomScale directly *if* complete flag is true
		if (fullscreenImage.complete) {
            console.log("fullscreenImage already complete, calling initial scale.");
			setInitialZoomScale();
		} else {
            console.log("fullscreenImage not complete, waiting for onload.");
        }


		// Mouse event listeners
		document.addEventListener( "mousemove", mouseEvent, { passive: false } );
		document.addEventListener( "mousedown", mouseEvent, { passive: false } );
		document.addEventListener( "mouseup", mouseEvent, { passive: false } );
		document.addEventListener( "mouseout", mouseEvent, { passive: false } );
		document.addEventListener( "wheel", mouseWheelEvent, { passive: false } );

		// Touch event listeners
		document.addEventListener( "touchstart", touchEvent, { passive: false } );
		document.addEventListener( "touchmove", touchEvent, { passive: false } );
		document.addEventListener( "touchend", touchEvent, { passive: false } );
		document.addEventListener( "touchcancel", touchEvent, { passive: false } );
	};

	// Calculate optimal scale to fit image in viewport
	const setInitialZoomScale = () => {
		if ( !zoomMe || !zoomMe.complete || zoomMe.naturalWidth === 0 || zoomMe.naturalHeight === 0 ) {
            // If image not loaded or has no dimensions, maybe try again shortly?
            // Or just don't apply any transform yet.
            console.warn("Initial zoom: Image not ready or has zero dimensions.");
            // Optionally reset view to default state if needed
            // view.reset();
            // view.applyTo(zoomMe);
            return;
        }

		// Get viewport dimensions
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		// Get image natural dimensions
		const imageWidth = zoomMe.naturalWidth;
		const imageHeight = zoomMe.naturalHeight;

		// Calculate scale factors for width and height
		const scaleX = viewportWidth / imageWidth;   // Removed unnecessary * 1.0
		const scaleY = viewportHeight / imageHeight; // Removed unnecessary * 1.0

		// Use the smaller scale to ensure image fits completely
		const initialScale = Math.min( scaleX, scaleY );

		// Calculate the dimensions of the image *after* scaling
		const scaledWidth = imageWidth * initialScale;
		const scaledHeight = imageHeight * initialScale;

		// Calculate the top-left position (offset) to center the scaled image
		const centerX = ( viewportWidth - scaledWidth ) / 2;
		const centerY = ( viewportHeight - scaledHeight ) / 2;

        // --- Correction Start ---
        // 1. Reset is okay, but we will overwrite its effects immediately.
        //    Consider removing the update() inside reset() if it causes issues,
        //    but it should be fine here.
		view.reset(); // Sets scale=1, pos=(0,0), matrix=[1,0,0,1,0,0]

        // 2. Set the *target* scale directly
        view.setScale(initialScale); // Sets view's internal scale, marks dirty

        // 3. Set the *target* position directly
        view.setPos(centerX, centerY); // Sets view's internal pos, marks dirty

        // 4. Update the matrix and apply the transform
        //    view.update() will now use initialScale and the correct centerX, centerY
        view.applyTo( zoomMe ); // Calls update() because dirty is true, then applies style
        // --- Correction End ---

        // Log the calculated values for verification
        console.log("Initial Zoom Calculated:", {
            viewportWidth, viewportHeight,
            imageWidth, imageHeight,
            scaleX, scaleY, initialScale,
            scaledWidth, scaledHeight,
            centerX, centerY
        });
	};

	const stopZoom = () => {
		document.removeEventListener( "mousemove", mouseEvent );
		document.removeEventListener( "mousedown", mouseEvent );
		document.removeEventListener( "mouseup", mouseEvent );
		document.removeEventListener( "mouseout", mouseEvent );
		document.removeEventListener( "wheel", mouseWheelEvent );

		document.removeEventListener( "touchstart", touchEvent );
		document.removeEventListener( "touchmove", touchEvent );
		document.removeEventListener( "touchend", touchEvent );
		document.removeEventListener( "touchcancel", touchEvent );

		// remove fullscreenview div from DOM
		fullscreenView.style.display = 'none';
		zoomMe = null;

		view.reset();

		fullscreenView.parentElement.removeChild( fullscreenView );
	};

	const mouse = { x: 0, y: 0, oldX: 0, oldY: 0, button: false };
	// Touch tracking variables
	const touch = {
		active: false,
		points: [],
		oldPoints: [],
		pinchDistance: 0,
		oldPinchDistance: 0
	};

	// Standalone pan function that works with both mouse and touch
	const handlePan = ( deltaX, deltaY ) => {
		if ( !zoomMe ) return;
		view.pan( { x: deltaX, y: deltaY } );
		view.applyTo( zoomMe );
	};

	// Standalone zoom function that works with both mouse and touch
	const handleZoom = ( x, y, scaleFactor ) => {
		if ( !zoomMe ) return;
		view.scaleAt( { x, y }, scaleFactor );
		view.applyTo( zoomMe );
	};

	function mouseEvent ( event ) {
		if ( !zoomMe ) return;

		if ( event.type === "mousedown" ) { mouse.button = true; }
		if ( event.type === "mouseup" || event.type === "mouseout" ) { mouse.button = false; }

		mouse.oldX = mouse.x;
		mouse.oldY = mouse.y;
		mouse.x = event.pageX;
		mouse.y = event.pageY;

		if ( mouse.button ) { // pan if button down
			handlePan( mouse.x - mouse.oldX, mouse.y - mouse.oldY );
		}
		event.preventDefault();
	}

	function mouseWheelEvent ( event ) {
		if ( !zoomMe ) return;

        // Use page coordinates directly as the zoom point
		const x = event.pageX;
		const y = event.pageY;
		const scaleBy = event.deltaY < 0 ? 1.1 : 1 / 1.1; // Keep scale direction consistent

		handleZoom( x, y, scaleBy ); // handleZoom calls view.scaleAt
		event.preventDefault();
	}

	function touchEvent ( event ) {
		if ( !zoomMe ) return;
		event.preventDefault();

		// Save old touch points
		touch.oldPoints = [ ...touch.points ];
		// touch.oldPinchDistance = touch.pinchDistance; // This was potentially missing, recalculate below

		// Update current touch points
		touch.points = [];
		for ( let i = 0; i < event.touches.length; i++ ) {
			touch.points.push( {
				x: event.touches[ i ].pageX,
				y: event.touches[ i ].pageY
			} );
		}

		// Handle touch events
		switch ( event.type ) {
			case 'touchstart':
				touch.active = true;
                // Reset pinch distance on new touch start
				touch.pinchDistance = 0;
                if(touch.points.length >= 2) {
                    touch.pinchDistance = getDistance(
						touch.points[ 0 ].x, touch.points[ 0 ].y,
						touch.points[ 1 ].x, touch.points[ 1 ].y
					);
                }
				break;

			case 'touchmove':
				if ( !touch.active ) return;

				// Handle pinch-to-zoom with two fingers
				if ( touch.points.length >= 2 && touch.oldPoints.length >= 2 ) {
					// Calculate current pinch distance
					const currentDistance = getDistance(
						touch.points[ 0 ].x, touch.points[ 0 ].y,
						touch.points[ 1 ].x, touch.points[ 1 ].y
					);

                    // Calculate previous pinch distance using old points
					const previousDistance = getDistance(
						touch.oldPoints[ 0 ].x, touch.oldPoints[ 0 ].y,
						touch.oldPoints[ 1 ].x, touch.oldPoints[ 1 ].y
					);

					// Calculate center point of the current pinch in screen coordinates
					const centerX = ( touch.points[ 0 ].x + touch.points[ 1 ].x ) / 2;
					const centerY = ( touch.points[ 0 ].y + touch.points[ 1 ].y ) / 2;

					// Calculate scale factor
					if ( previousDistance > 0 ) { // Avoid division by zero
						const scaleFactor = currentDistance / previousDistance;
                        // Apply zoom if scale factor is significant enough to avoid jitter
						if ( Math.abs( 1 - scaleFactor ) > 0.005 ) { // Adjust threshold as needed
                            // Use screen coordinates (centerX, centerY) directly for scaling point
							handleZoom( centerX, centerY, scaleFactor );
						}
					}

					// Update pinch distance for the next move event
					touch.pinchDistance = currentDistance; // Update stored distance
				}
				// Handle pan with one finger (or move of the multi-touch centroid)
				// Check if oldPoints exist to calculate delta
				else if ( touch.points.length >= 1 && touch.oldPoints.length >= 1 ) {
				    // Use the first touch point for simplicity in the 1-finger case
                    // For multi-finger pan, one could use the centroid movement
                    const currentX = touch.points[0].x;
                    const currentY = touch.points[0].y;
                    const previousX = touch.oldPoints[0].x;
                    const previousY = touch.oldPoints[0].y;

					const deltaX = currentX - previousX;
					const deltaY = currentY - previousY;
					handlePan( deltaX, deltaY );
				}
				break;

			case 'touchend':
			case 'touchcancel':
                // If less than 2 touches remain, clear pinch state
                if(event.touches.length < 2) {
                    touch.pinchDistance = 0;
                }
                // If no touches remain, deactivate
				if (event.touches.length === 0) {
                    touch.active = false;
                }
                // Update points array to reflect remaining touches accurately for next 'move'
                touch.points = [];
                for ( let i = 0; i < event.touches.length; i++ ) {
                    touch.points.push( {
                        x: event.touches[ i ].pageX,
                        y: event.touches[ i ].pageY
                    } );
                }
				break;
		}
	}

	
	// Helper function to calculate distance between two points
	function getDistance ( x1, y1, x2, y2 ) {
		return Math.sqrt( Math.pow( x2 - x1, 2 ) + Math.pow( y2 - y1, 2 ) );
	}
} );