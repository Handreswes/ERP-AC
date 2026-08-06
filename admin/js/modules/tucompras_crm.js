// Utility for Colombian Location Data
window.Locations = {
    departments: {
        "Amazonas": ["Leticia", "Puerto Nariño", "El Encanto", "La Chorrera", "La Pedrera", "Mirití-Paraná", "Puerto Alegría", "Puerto Arica", "Puerto Santander", "Tarapacá"],
        "Antioquia": ["Medellín", "Abejorral", "Abriaquí", "Alejandría", "Amagá", "Amalfi", "Andes", "Angelópolis", "Angostura", "Anorí", "Anzá", "Apartadó", "Arboletes", "Argelia", "Armenia", "Barbosa", "Bello", "Belmira", "Betania", "Betulia", "Briceño", "Buriticá", "Cáceres", "Caldas", "Campamento", "Cañasgordas", "Caracolí", "Caramanta", "Carepa", "Carolina del Príncipe", "Caucasia", "Chigorodó", "Cisneros", "Ciudad Bolívar", "Cocorná", "Concepción", "Concordia", "Copacabana", "Dabeiba", "Donmatías", "Ebéjico", "El Bagre", "El Carmen de Viboral", "El Peñol", "El Retiro", "Entrerríos", "Envigado", "Fredonia", "Frontino", "Giraldo", "Girardota", "Gómez Plata", "Granada", "Guadalupe", "Guarne", "Guatapé", "Heliconia", "Hispania", "Itagüí", "Ituango", "Jardín", "Jericó", "La Ceja", "La Estrella", "La Pintada", "La Unión", "Liborina", "Maceo", "Marinilla", "Montebello", "Murindó", "Mutatá", "Nariño", "Nechí", "Necoclí", "Olaya", "Peque", "Pueblorrico", "Puerto Berrío", "Puerto Nare", "Puerto Triunfo", "Remedios", "Rionegro", "Sabanalarga", "Sabaneta", "Salgar", "San Andrés de Cuerquia", "San Carlos", "San Francisco", "San Jerónimo", "San José de la Montaña", "San Juan de Urabá", "San Luis", "San Pedro de Urabá", "San Pedro de los Milagros", "San Rafael", "San Roque", "San Vicente Ferrer", "Santa Bárbara", "Santa Fe de Antioquia", "Santa Rosa de Osos", "Santo Domingo", "El Santuario", "Segovia", "Sonsón", "Sopetrán", "Támesis", "Tarazá", "Tarso", "Titiribí", "Toledo", "Turbo", "Uramita", "Urrao", "Valdivia", "Valparaíso", "Vegachí", "Venecia", "Vigía del Fuerte", "Yalí", "Yarumal", "Yolombó", "Yondó", "Zaragoza"],
        "Arauca": ["Arauca", "Arauquita", "Cravo Norte", "Fortul", "Puerto Rondón", "Saravena", "Tame"],
        "Atlántico": ["Barranquilla", "Baranoa", "Campo de la Cruz", "Candelaria", "Galapa", "Juan de Acosta", "Luruaco", "Malambo", "Manatí", "Palmar de Varela", "Píojó", "Polonuevo", "Ponedera", "Puerto Colombia", "Repelón", "Sabanagrande", "Sabanalarga", "Santa Lucía", "Santo Tomás", "Soledad", "Suan", "Tubará", "Usiacurí"],
        "Bolívar": ["Cartagena", "Achí", "Altos del Rosario", "Arenal", "Arjona", "Arroyohondo", "Barranco de Loba", "Calamar", "Cantagallo", "Cicuco", "Clemencia", "Córdoba", "El Carmen de Bolívar", "El Guamo", "El Peñón", "Hatillo de Loba", "Magangué", "Mahates", "Margarita", "María la Baja", "Montecristo", "Mompox", "Morales", "Norosí", "Pinillos", "Regidor", "Río Viejo", "San Cristóbal", "San Estanislao", "San Fernando", "San Jacinto", "San Jacinto del Cauca", "San Juan Nepomuceno", "San Martín de Loba", "San Pablo", "Santa Catalina", "Santa Rosa", "Santa Rosa del Sur", "Simití", "Soplaviento", "Talaigua Nuevo", "Tiquisio", "Turbaco", "Turbaná", "Villanueva", "Zambrano"],
        "Boyacá": ["Tunja", "Almeida", "Aquitania", "Arcabuco", "Belén", "Berbeo", "Betéitiva", "Boavita", "Boyacá", "Briceño", "Buenavista", "Busbanzá", "Caldas", "Campohermoso", "Cerinza", "Chinavita", "Chiquinquirá", "Chíquiza", "Chiscas", "Chita", "Chitaraque", "Chivatá", "Chivor", "Ciénega", "Cómbita", "Coper", "Corrales", "Covarachía", "Cubará", "Cucaita", "Cuítiva", "Duitama", "El Cocuy", "El Espino", "Firavitoba", "Floresta", "Gachantivá", "Gámeza", "Garagoa", "Guacamayas", "Guateque", "Guayatá", "Güicán", "Iza", "Jenesano", "Jericó", "Labranzagrande", "La Capilla", "La Victoria", "La Uvita", "Leiva", "Macanal", "Maripí", "Miraflores", "Mongua", "Monguí", "Moniquirá", "Motavita", "Muzo", "Nobsa", "Nuevo Colón", "Oicatá", "Otanche", "Pachavita", "Páez", "Paipa", "Pajarito", "Panqueba", "Pauna", "Paya", "Paz de Río", "Pesca", "Pisba", "Puerto Boyacá", "Quípama", "Ramiriquí", "Ráquira", "Rondón", "Saboyá", "Sáchica", "Samacá", "San Eduardo", "San José de Pare", "San Luis de Gaceno", "San Mateo", "San Miguel de Sema", "San Pablo de Borbur", "Santa Sofía", "Santa María", "Santa Rosa de Viterbo", "Santana", "Satasán", "Soatá", "Socha", "Socotá", "Sogamoso", "Somondoco", "Sora", "Sotaquirá", "Soracá", "Susacón", "Sutamarchán", "Sutatenza", "Tasco", "Tenza", "Tibarosa", "Tinjacá", "Tipacoque", "Toca", "Togüí", "Tota", "Tununguá", "Turmequé", "Tuta", "Tutazá", "Úmbita", "Ventaquemada", "Viracachá", "Zetaquira"],
        "Caldas": ["Manizales", "Aguadas", "Anserma", "Aranzazu", "Belalcázar", "Chinchiná", "Filadelfia", "La Dorada", "La Merced", "Manzanares", "Marmato", "Marquetalia", "Marulanda", "Neira", "Norcasia", "Pácora", "Palestina", "Pensilvania", "Riosucio", "Risaralda", "Salamina", "Samaná", "San José", "Supía", "Victoria", "Villamaría", "Viterbo"],
        "Caquetá": ["Florencia", "Albania", "Belén de los Andaquíes", "Cartagena del Chairá", "Curillo", "El Carmel", "El Paujil", "La Montañita", "Milán", "Morelia", "Puerto Rico", "San José del Fragua", "San Vicente del Caguán", "Solano", "Solita", "Valparaíso"],
        "Casanare": ["Yopal", "Aguazul", "Chámeza", "Hato Corozal", "La Salina", "Maní", "Monterrey", "Nunchía", "Orocué", "Paz de Ariporo", "Pore", "Recetor", "Sabanalarga", "Sácama", "San Luis de Palenque", "Támara", "Tauramena", "Trinidad", "Villanueva"],
        "Cauca": ["Popayán", "Almaguer", "Argelia", "Balboa", "Bolívar", "Buenos Aires", "Cajibío", "Caldono", "Caloto", "Corinto", "El Tambo", "Florencia", "Guachené", "Guapí", "Inzá", "Jambaló", "La Sierra", "La Vega", "López de Micay", "Mercaderes", "Miranda", "Morales", "Padilla", "Páez", "Piamonte", "Piendamó", "Puerto Tejada", "Puracé", "Rosas", "San Sebastián", "Santa Rosa", "Santander de Quilichao", "Silvia", "Sotará", "Suárez", "Sucre", "Timbío", "Timbiquí", "Toribío", "Totoró", "Villa Rica"],
        "Cesar": ["Valledupar", "Aguachica", "Agustín Codazzi", "Astrea", "Becerril", "Bosconia", "Chimichagua", "Chiriguaná", "Curumaní", "El Copey", "El Paso", "Gamarra", "González", "La Gloria", "La Jagua de Ibirico", "La Paz", "Manaure Balcón del Cesar", "Pailitas", "Pelaya", "Pueblo Bello", "Río de Oro", "San Alberto", "San Diego", "San Martín", "Tamalameque"],
        "Chocó": ["Quibdó", "Acandí", "Alto Baudó", "Atrato", "Bagadó", "Bahía Solano", "Bajo Baudó", "Bojayá", "El Cantón de San Pablo", "Carmen del Darién", "Cértegui", "Condoto", "El Carmen de Atrato", "El Litoral del San Juan", "Istmina", "Juradó", "Lloró", "Medio Atrato", "Medio Baudó", "Medio San Juan", "Nóvita", "Nuquí", "Río Iró", "Río Quito", "Riosucio", "San José del Palmar", "Sipí", "Tadó", "Unguía", "Unión Panamericana"],
        "Córdoba": ["Montería", "Ayapel", "Buenavista", "Canalete", "Cereté", "Chimá", "Chinú", "Ciénaga de Oro", "Cotorra", "La Apartada", "Lorica", "Los Córdobas", "Momil", "Montelíbano", "Moñitos", "Planeta Rica", "Pueblo Nuevo", "Puerto Escondido", "Puerto Libertador", "Purísima", "Sahagún", "San Andrés de Sotavento", "San Antero", "San Bernardo del Viento", "San Carlos", "San José de Uré", "San Pelayo", "Tierralta", "Tuchín", "Valencia"],
        "Cundinamarca": ["Bogotá", "Agua de Dios", "Albán", "Anapoima", "Anolaima", "Apulo", "Arbeláez", "Beltrán", "Bituima", "Bojacá", "Cabrera", "Cachipay", "Cajicá", "Cáqueza", "Carmen de Carupa", "Chaguaní", "Chía", "Chipaque", "Choachí", "Chocontá", "Cogua", "Cota", "Cucunubá", "El Colegio", "El Peñón", "El Rosal", "Facatativá", "Fómeque", "Fosca", "Funza", "Fúquene", "Fusagasugá", "Gachalá", "Gachancipá", "Gachetá", "Gama", "Girardot", "Granada", "Guachetá", "Guaduas", "Guasca", "Guataquí", "Guatavita", "Guayabal de Síquima", "Guayabetal", "Gutiérrez", "Jerusalén", "Junín", "La Calera", "La Mesa", "La Palma", "La Peña", "La Vega", "Lenguazaque", "Machetá", "Madrid", "Manta", "Medina", "Mosquera", "Nariño", "Nemocón", "Nilo", "Nimaima", "Nocaima", "Pacho", "Paime", "Pandi", "Paratebueno", "Pasca", "Puerto Salgar", "Pulí", "Quebradanegra", "Quetame", "Quipile", "Ricaurte", "San Antonio del Tequendama", "San Bernardo", "San Cayetano", "San Francisco", "San Juan de Rioseco", "Sasaima", "Sesquilé", "Sibaté", "Silvania", "Simijaca", "Soacha", "Sopó", "Subachoque", "Suesca", "Susa", "Sutatausa", "Tabio", "Tausa", "Tena", "Tenjo", "Tibacuy", "Tibarita", "Tocancipá", "Topaipí", "Ubalá", "Ubaque", "Ubaté", "Une", "Útica", "Venecia", "Vergara", "Vianí", "Villagómez", "Villapinzón", "Villeta", "Viotá", "Yacopí", "Zipacón", "Zipaquirá"],
        "Guainía": ["Inírida", "Barrancominas", "Mapiripana", "San Felipe", "Puerto Colombia", "La Guadalupe", "Cacahual", "Pana Pana", "Morichal"],
        "Guaviare": ["San José del Guaviare", "Calamar", "El Retorno", "Miraflores"],
        "Huila": ["Neiva", "Acevedo", "Agrado", "Aipe", "Algeciras", "Altamira", "Baraya", "Campoalegre", "Colombia", "Elías", "Garzón", "Gigante", "Guadalupe", "Hobo", "Íquira", "Isnos", "La Argentina", "La Plata", "Nátaga", "Oporapa", "Paicol", "Palermo", "Palestina", "Pital", "Pitalito", "Rivera", "Saladoblanco", "San Agustín", "Santa María", "Suaza", "Tarqui", "Tello", "Teruel", "Tesalia", "Timaná", "Villavieja", "Yaguará"],
        "La Guajira": ["Riohacha", "Albania", "Barrancas", "Dibulla", "Distracción", "El Molino", "Fonseca", "Hatonuevo", "La Jagua del Pilar", "Maicao", "Manaure", "San Juan del Cesar", "Uribia", "Urumita", "Villanueva"],
        "Magdalena": ["Santa Marta", "Algarrobo", "Aracataca", "Ariguaní", "Cerro de San Antonio", "Chibolo", "Ciénaga", "Concordia", "El Banco", "El Piñón", "El Retén", "Fundación", "Guamal", "Nueva Granada", "Pedraza", "Pijiño del Carmen", "Pivijay", "Plato", "Puebloviejo", "Remolino", "Sabanas de San Ángel", "Salamina", "San Zenón", "Santa Ana", "Santa Bárbara de Pinto", "Sitionuevo", "Tenerife", "Zapayán", "Zona Bananera"],
        "Meta": ["Villavicencio", "Acacías", "Barranca de Upía", "Cabuyaro", "Castilla la Nueva", "Cubarral", "Cumaral", "El Calvario", "El Castillo", "El Dorado", "Fuente de Oro", "Granada", "Guamal", "Mapiripán", "Mesetas", "La Macarena", "Uribe", "Lejanías", "Puerto Concordia", "Puerto Gaitán", "Puerto López", "Puerto Lleras", "Puerto Rico", "Restrepo", "San Carlos de Guaroa", "San Juan de Arama", "San Juanito", "San Martín", "Vista Hermosa"],
        "Nariño": ["Pasto", "Albán", "Aldana", "Ancuya", "Arboleda", "Barbacoas", "Belén", "Buesaco", "Chachagüí", "Colón", "Consaca", "Contadero", "Córdoba", "Cuaspud", "Cumbal", "Cumbitara", "El Charco", "El Peñol", "El Rosario", "El Tablón de Gómez", "El Tambo", "Funes", "Guachucal", "Guaitarilla", "Gualmatán", "Iles", "Imués", "Ipiales", "La Cruz", "La Florida", "La Llanada", "La Tola", "La Unión", "Leiva", "Linares", "Los Andes", "Magüí Payán", "Mallama", "Mosquera", "Nariño", "Olaya Herrera", "Ospina", "Francisco Pizarro", "Policarpa", "Potosí", "Providencia", "Puerres", "Pupiales", "Ricaurte", "Roberto Payán", "Samaniego", "San Bernardo", "San Lorenzo", "San Pablo", "San Pedro de Cartago", "Sandoná", "Santa Bárbara", "Santacruz", "Sapuyes", "Taminango", "Tangua", "Tumaco", "Túquerres", "Yacuanquer"],
        "Norte de Santander": ["Cúcuta", "Ábrego", "Arboledas", "Bochalema", "Bucarasica", "Cáchira", "CÁcota", "ChinÁcota", "ChitagÁ", "Convención", "CÚcutilla", "Durania", "El Carmen", "El Tarra", "El Zulia", "Gramalote", "HacarÍ", "HerrÁn", "La Esperanza", "La Playa", "Labateca", "Los Patios", "Lourdes", "Mutiscua", "OcaÑa", "Pamplona", "Pamplonita", "Puerto Santander", "Ragonvalia", "Salazar", "San Calixto", "San Cayetano", "Santiago", "Sardinata", "Silos", "TibÚ", "Toledo", "Villa Caro", "Villa del Rosario"],
        "Putumayo": ["Mocoa", "Colón", "Orito", "Puerto Asís", "Puerto Caicedo", "Puerto Guzmán", "Puerto Leguízamo", "Sibundoy", "San Francisco", "San Miguel", "Santiago", "Valle del Guamuez", "Villagarzón"],
        "Quindío": ["Armenia", "Buenavista", "Calarcá", "Circasia", "Córdoba", "Filandia", "Génova", "La Tebaida", "Montenegro", "Pijao", "Quimbaya", "Salento"],
        "Risaralda": ["Pereira", "Apía", "Balboa", "Belén de Umbría", "Dosquebradas", "Guática", "La Celia", "La Virginia", "Marsella", "Mistrató", "Pueblo Rico", "Quinchía", "Santa Rosa de Cabal", "Santuario"],
        "San Andrés y Providencia": ["San Andrés", "Providencia"],
        "Santander": ["Bucaramanga", "Aguada", "Albania", "Aratoca", "Barbosa", "Barichara", "Barrancabermeja", "Betulia", "Bolívar", "Cabrera", "California", "Capitanejo", "Carcasí", "Cepitá", "Cerrito", "Charalá", "Charta", "Chima", "Chipatá", "Cimitarra", "Concepción", "Confines", "Contratación", "Coromoro", "Curití", "El Carmen de Chucurí", "El Guacamayo", "El Peñón", "El Playón", "Encino", "Enciso", "Floridablanca", "Florián", "Galán", "Gámbita", "Girón", "Guaca", "Guadalupe", "Guapotá", "Guavatá", "Güepsa", "Hato", "Jesús María", "Jordán", "La Belleza", "La Paz", "Landázuri", "Lebrija", "Los Santos", "Macaravita", "Málaga", "Matanza", "Mogotes", "Molagavita", "Ocamonte", "Oiba", "Onzaga", "Palmar", "Palmas del Socorro", "Páramo", "Piedecuesta", "Pinchote", "Puente Nacional", "Puerto Parra", "Puerto Wilches", "Rionegro", "Sabana de Torres", "San Andrés", "San Benito", "San Gil", "San Joaquín", "San José de Miranda", "San Miguel", "San Vicente de Chucurí", "Santa Bárbara", "Santa Helena del Opón", "Simacota", "Socorro", "Suaita", "Sucre", "Suratá", "Tona", "Valle de San José", "Vélez", "Vetas", "Villanueva", "Zepatá"],
        "Sucre": ["Sincelejo", "Buenavista", "Caimito", "Coloso", "Corozal", "Coveñas", "Chalán", "El Roble", "Galeras", "Guaranda", "La Unión", "Los Palmitos", "Majagual", "Morroa", "Ovejas", "Palmito", "Sampués", "San Benito Abad", "San Juan de Betulia", "San Marcos", "San Onofre", "San Pedro", "Sincé", "Sucre", "Tolú", "Tolú Viejo"],
        "Tolima": ["Ibagué", "Alpujarra", "Alvarado", "Ambalema", "AnzoÁtegui", "Armero Guayabal", "Ataco", "Cajamarca", "Carmen de ApicalÁ", "Casabianca", "Chaparral", "Coello", "Coyaima", "Cunday", "Dolores", "Espinal", "Falan", "Flamenco", "Fresno", "Guamo", "Herveo", "Honda", "Icononzo", "LÉrida", "LÍbano", "Mariquita", "Melgar", "Murillo", "Natagaima", "Ortega", "Palocabildo", "Piedras", "Planadas", "Prado", "PurificaciÓn", "Rioblanco", "Roncesvalles", "Rovira", "SaldaÑa", "San Antonio", "San Luis", "Santa Isabel", "SuÁrez", "Valle de San Juan", "Venadillo", "Villahermosa", "Villarrica"],
        "Valle del Cauca": ["Cali", "Alcalá", "Andalucía", "Ansermanuevo", "Argelia", "Bolívar", "Buenaventura", "Buga", "Bugalagrande", "Caicedonia", "Calima", "Candelaria", "Cartago", "Dagua", "El Águila", "El Cairo", "El Cerrito", "El Dovio", "Florida", "Ginebra", "Guacarí", "Jamundí", "La Cumbre", "La Unión", "La Victoria", "Obando", "Palmira", "Pradera", "Restrepo", "Riofrío", "Roldanillo", "San Pedro", "Sevilla", "Toro", "Trujillo", "Tuluá", "Ulloa", "Versalles", "Vijes", "Yotoco", "Yumbo", "Zarzal"],
        "Vaupés": ["Mitú", "Carurú", "Pacoa", "Taraira", "Papunahua", "Yavaraté"],
        "Vichada": ["Puerto Carreño", "La Primavera", "Santa Rosalía", "Cumaribo"]
    },

    loadCustomCities() {
        try {
            const raw = localStorage.getItem('erp_custom_cities');
            if (raw) {
                const customMap = JSON.parse(raw);
                Object.keys(customMap).forEach(dept => {
                    if (this.departments[dept]) {
                        customMap[dept].forEach(city => {
                            if (!this.departments[dept].includes(city)) {
                                this.departments[dept].push(city);
                            }
                        });
                    } else {
                        this.departments[dept] = customMap[dept];
                    }
                });
            }
        } catch (e) {
            console.warn('Error loading custom cities:', e);
        }
    },

    addCustomCity(deptName, cityName) {
        if (!cityName || cityName.trim().length === 0) return;
        const formattedCity = cityName.trim();
        const dept = deptName && this.departments[deptName] ? deptName : 'Otros';

        if (!this.departments[dept]) {
            this.departments[dept] = [];
        }

        if (!this.departments[dept].includes(formattedCity)) {
            this.departments[dept].push(formattedCity);
            this.departments[dept].sort();

            try {
                let raw = localStorage.getItem('erp_custom_cities');
                let customMap = raw ? JSON.parse(raw) : {};
                if (!customMap[dept]) customMap[dept] = [];
                if (!customMap[dept].includes(formattedCity)) {
                    customMap[dept].push(formattedCity);
                }
                localStorage.setItem('erp_custom_cities', JSON.stringify(customMap));
            } catch (e) {
                console.warn('Error saving custom city:', e);
            }
        }
    },

    populateDepartments(selectId) {
        this.loadCustomCities();
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="">Seleccione Departamento...</option>' +
            Object.keys(this.departments).sort().map(d => `<option value="${d}">${d}</option>`).join('');
    },

    populateCities(deptName, datalistOrSelectId) {
        this.loadCustomCities();
        const el = document.getElementById(datalistOrSelectId);
        if (!el) return;

        let cities = [];
        if (deptName && this.departments[deptName]) {
            cities = [...this.departments[deptName]].sort();
        } else {
            const set = new Set();
            Object.values(this.departments).forEach(arr => arr.forEach(c => set.add(c)));
            cities = Array.from(set).sort();
        }

        const tag = el.tagName.toLowerCase();
        if (tag === 'datalist') {
            el.innerHTML = cities.map(c => `<option value="${c}"></option>`).join('');
        } else if (tag === 'select') {
            el.innerHTML = '<option value="">-- Seleccione Ciudad (' + cities.length + ' municipios) --</option>' +
                '<option value="OTRO">✏️ OTRO (Escribir ciudad manualmente)...</option>' +
                cities.map(c => `<option value="${c}">${c}</option>`).join('');
        }
    },

    getTrackingUrl(carrier, trackingNumber) {
        if (!trackingNumber) return "#";
        const urls = {
            "Interrapidisimo": `https://servicios.interrapidisimo.com/SrvRastreoGuias/RastreoGuia.aspx?guia=${trackingNumber}`,
            "Servientrega": `https://www.servientrega.com/wps/portal/Colombia/transaccional/rastreo-envios?id=${trackingNumber}`,
            "Envía": `https://envia.co/seguimiento-de-envio?guia=${trackingNumber}`,
            "Coordinadora": `https://www.coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo/?guia=${trackingNumber}`,
            "TCC": `https://www.tcc.com.co/logistica/rastreo-de-envios/?guia=${trackingNumber}`
        };
        // Fallback for Interrapidisimo sometimes uses a different portal
        if (carrier === 'Interrapidisimo' && trackingNumber.length > 0) {
            return `https://servicios.interrapidisimo.com/SrvRastreoGuias/RastreoGuia.aspx?guia=${trackingNumber}`;
        }
        return urls[carrier] || `https://www.google.com/search?q=rastreo+${carrier}+${trackingNumber}`;
    }
};

window.TuComprasCRM = {
    async init() {
        this.customers = await this.getCustomers();
    },

    async renderPanel() {
        this.customers = await this.getCustomers();
        const contentArea = document.getElementById('content-area');
        if (!document.getElementById('tucompras-crm-panel')) {
            const panel = document.createElement('div');
            panel.id = 'tucompras-crm-panel';
            panel.className = 'panel';
            contentArea.appendChild(panel);
        }

        const panel = document.getElementById('tucompras-crm-panel');
        panel.innerHTML = `
            <div class="panel-header">
                <h1>CRM Clientes eCommerce</h1>
                <div class="actions">
                    <button class="btn btn-primary" onclick="alert('Funcionalidad de exportación próximamente')">Exportar Clientes</button>
                </div>
            </div>

            <div class="stats-grid" style="margin-top: 1rem;">
                <div class="stat-card">
                    <h3>Total Clientes</h3>
                    <p class="stat-value" id="tc-crm-total-count">${this.customers.length}</p>
                </div>
            </div>

            <div class="search-bar" style="margin-top: 1.5rem; background: var(--bg-card); border: 1px solid var(--accent); border-radius: 12px; padding: 0.75rem 1rem; display: flex; align-items: center; gap: 10px; box-shadow: 0 0 15px rgba(59,130,246,0.1);">
                <i class="fas fa-search" style="color: var(--accent);"></i>
                <input type="text" id="tc-crm-search" placeholder="Buscar por nombre, teléfono, ciudad o depto..." style="background: none; border: none; color: white; width: 100%; outline: none; font-size: 1rem;">
            </div>

            <div class="table-container" style="margin-top: 1.5rem;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nombre</th>
                            <th>Teléfono</th>
                            <th>Ubicación</th>
                            <th>Dirección</th>
                            <th>Último Pedido</th>
                        </tr>
                    </thead>
                    <tbody id="tc-crm-list">
                        ${this.renderListItems(this.customers)}
                    </tbody>
                </table>
            </div>
        `;

        this.setupEventListeners();
    },

    renderListItems(customers) {
        return customers.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone}</td>
                <td>${c.city || '-'}, ${c.dept || '-'}</td>
                <td>${c.address || '-'}</td>
                <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center">No hay clientes registrados</td></tr>';
    },

    setupEventListeners() {
        const searchInput = document.getElementById('tc-crm-search');
        if (searchInput) {
            searchInput.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = this.customers.filter(c => 
                    (c.name || '').toLowerCase().includes(term) ||
                    (c.phone || '').toLowerCase().includes(term) ||
                    (c.city || '').toLowerCase().includes(term) ||
                    (c.dept || '').toLowerCase().includes(term)
                );
                document.getElementById('tc-crm-list').innerHTML = this.renderListItems(filtered);
                document.getElementById('tc-crm-total-count').textContent = filtered.length;
            };
        }
    },

    async getCustomers() {
        // Sync in background to update local storage
        Storage.syncTable(STORAGE_KEYS.TUCOMPRAS_CUSTOMERS).then(() => {
            // Update UI if the panel is still open
            if (document.getElementById('tucompras-crm-panel')) {
                const refreshed = Storage.get(STORAGE_KEYS.TUCOMPRAS_CUSTOMERS).sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
                this.customers = refreshed;
                const list = document.getElementById('tc-crm-list');
                if (list) list.innerHTML = this.renderListItems(refreshed);
                const count = document.getElementById('tc-crm-total-count');
                if (count) count.textContent = refreshed.length;
            }
        }).catch(err => console.warn('Could not sync tucompras_customers:', err));

        // Return current cached customers immediately
        return Storage.get(STORAGE_KEYS.TUCOMPRAS_CUSTOMERS).sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));
    },

    async addCustomer(customer) {
        if (!customer.name || !customer.phone) {
            throw new Error('Nombre y Teléfono son obligatorios');
        }
        return await Storage.addItem(STORAGE_KEYS.TUCOMPRAS_CUSTOMERS, {
            ...customer,
            created_at: new Date().toISOString()
        });
    }
};
