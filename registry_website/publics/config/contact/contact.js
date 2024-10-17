

"use strict";

// Class definition
var KTContactApply = function () {
	var submitButton;
	var validator;
	var form;
	var selectedlocation;

	// Private functions
    var initMap = function(elementId) {
        // Check if Leaflet is included
        if (!L) {
            return;
        }

        // Define Map Location
        var leaflet = L.map(elementId, {
            center: [40.725, -73.985],
            zoom: 30
        });

        // Init Leaflet Map. For more info check the plugin's documentation: https://leafletjs.com/
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(leaflet);

        // Set Geocoding
        var geocodeService;
        if (typeof L.esri.Geocoding === 'undefined') {
            geocodeService = L.esri.geocodeService();
        } else {
            geocodeService = L.esri.Geocoding.geocodeService();
        }

        // Define Marker Layer
        var markerLayer = L.layerGroup().addTo(leaflet);

        // Set Custom SVG icon marker
        var leafletIcon = L.divIcon({
            html: `<span class="svg-icon svg-icon-primary shadow svg-icon-3x"><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="24px" height="24px" viewBox="0 0 24 24" version="1.1"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><rect x="0" y="24" width="24" height="0"/><path d="M5,10.5 C5,6 8,3 12.5,3 C17,3 20,6.75 20,10.5 C20,12.8325623 17.8236613,16.03566 13.470984,20.1092932 C12.9154018,20.6292577 12.0585054,20.6508331 11.4774555,20.1594925 C7.15915182,16.5078313 5,13.2880005 5,10.5 Z M12.5,12 C13.8807119,12 15,10.8807119 15,9.5 C15,8.11928813 13.8807119,7 12.5,7 C11.1192881,7 10,8.11928813 10,9.5 C10,10.8807119 11.1192881,12 12.5,12 Z" fill="#000000" fill-rule="nonzero"/></g></svg></span>`,
            bgPos: [10, 10],
            iconAnchor: [20, 37],
            popupAnchor: [0, -37],
            className: 'leaflet-marker'
        });

		// Show current address
		L.marker(bmc_localisation.gps, { icon: leafletIcon }).addTo(markerLayer).bindPopup(bmc_localisation.title, { closeButton: false }).openPopup();

        // Map onClick Action
        leaflet.on('click', function (e) {
            geocodeService.reverse().latlng(e.latlng).run(function (error, result) {
                if (error) {
                    return;
                }
                markerLayer.clearLayers();
                selectedlocation = result.address.Match_addr;
                L.marker(result.latlng, { icon: leafletIcon }).addTo(markerLayer).bindPopup(result.address.Match_addr, { closeButton: false }).openPopup();

                // Show popup confirmation. For more info check the plugin's official documentation: https://sweetalert2.github.io/
                Swal.fire({
                    html: 'Your selected - <b>"' + selectedlocation + ' - ' + result.latlng + '"</b>.',
                    icon: "success",
                    buttonsStyling: false,
                    confirmButtonText: "Ok, compris!",
                    customClass: {
                        confirmButton: "btn btn-primary"
                    }
                }).then(function (result) {
                    // Confirmed
                });
            });
        });
    }

	// Init form inputs
	var initForm = function() {
		// Team assign. For more info, plase visit the official plugin site: https://select2.org/
        $(form.querySelector('[name="position"]')).on('change', function() {
            // Revalidate the field when an option is chosen
            validator.revalidateField('position');
        });		
	}

	// Handle form validation and submittion
	var handleForm = function() {
		// Stepper custom navigation

		// Init form validation rules. For more info check the FormValidation plugin's official documentation:https://formvalidation.io/
		validator = FormValidation.formValidation(
			form,
			{
				fields: {
					'name': {
						validators: {
							notEmpty: {
								message: 'Le nom et prenom est réquis'
							}
						}
					},
					'email': {
                        validators: {
							notEmpty: {
								message: "L'email est réquis"
							},
                            emailAddress: {
								message: "L'adresse email n'est pas valide"
							}
						}
					},
					'subject' : {
						validators: {
							notEmpty: {
								message: 'Le sujet est réquis'
							}
						}
					},
					'message': {
                        validators: {
							notEmpty: {
								message: 'Message est réquis'
							}
						}
					}		 
				},
				plugins: {
					trigger: new FormValidation.plugins.Trigger(),
					bootstrap: new FormValidation.plugins.Bootstrap5({
						rowSelector: '.fv-row',
                        eleInvalidClass: '',
                        eleValidClass: ''
					})
				}
			}
		);

		// Action buttons
		submitButton.addEventListener('click', function (e) {
			e.preventDefault();

			// Validate form before submit
			if (validator) {
				validator.validate().then(function (status) {
					console.log('validated!');

					if (status == 'Valid') {
						submitButton.setAttribute('data-kt-indicator', 'on');

						// Disable button to avoid multiple click 
							submitButton.disabled = true;

							// Simulate form submission delay
							setTimeout(function() {
								axios.post(req_ser+'/api_central/send_message', {
									// Données à envoyer via POST
									message:form.querySelector('[name="message"]').value,
									name:form.querySelector('[name="name"]').value,
									sujet:form.querySelector('[name="subject"]').value,
									email:form.querySelector('[name="email"]').value,
									// Ajoute d'autres champs si nécessaire
								})
								.then(function (response) {
									console.log(response)
									// Enlever l'indicateur une fois la requête réussie
									submitButton.removeAttribute('data-kt-indicator');

									// Enable button
									submitButton.disabled = false;
									if(response.data.status=="200"){
									

									// Message de succès
									Swal.fire({
										text: "Votre message a bien été envoyé!",
										icon: "success",
										buttonsStyling: false,
										confirmButtonText: "Ok, compris!",
										customClass: {
											confirmButton: "btn btn-primary"
										}
									}).then(()=>{
										form.reset();
									})
								}else{
										Swal.fire({
											text: "Une erreur s'est produite, veuillez réessayer.",
											icon: "error",
											buttonsStyling: false,
											confirmButtonText: "Ok, compris!",
											customClass: {
												confirmButton: "btn btn-danger"
											}
										});
									}
								})
								.catch(function (error) {
									// Enlever l'indicateur en cas d'erreur
									submitButton.removeAttribute('data-kt-indicator');

									// Enable button
									submitButton.disabled = false;

									// Gérer l'erreur ici
									Swal.fire({
										text: "Une erreur s'est produite, veuillez réessayer.",
										icon: "error",
										buttonsStyling: false,
										confirmButtonText: "Ok, compris!",
										customClass: {
											confirmButton: "btn btn-danger"
										}
									});
								});
							}, 2000);
						
						
					} else {
						// Scroll top

						// Show error popuo. For more info check the plugin's official documentation: https://sweetalert2.github.io/
						Swal.fire({
							text: "Désolé, il semble avoir une erreur. Veuillez recommencer!",
							icon: "error",
							buttonsStyling: false,
							confirmButtonText: "Ok, compris!",
							customClass: {
								confirmButton: "btn btn-primary"
							}
						}).then(function (result) {
							KTUtil.scrollTop();
						});
					}
				});
			}
		});
	}

	return {
		// Public functions
		init: function () {
			// Elements
			form = document.querySelector('#kt_contact_form');
			submitButton = document.getElementById('kt_contact_submit_button');

			initForm();
			handleForm();
			initMap('kt_contact_map');
		}
	};
}();

// On document ready
KTUtil.onDOMContentLoaded(function () {
	KTContactApply.init();
});