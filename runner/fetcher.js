import { config } from './config.js';

export async function fetchQuestions(topic) {
    let apiQuestions = [];
    try {
        // Fetch a large chunk from the API to try and find topic matches
        const randomOffset = Math.floor(Math.random() * 50);
        const url = `https://datasets-server.huggingface.co/rows?dataset=Idavidrein%2Fgpqa&config=gpqa_diamond&split=train&offset=${randomOffset}&length=100`;
        
        const res = await fetch(url, {
            headers: { "Authorization": `Bearer ${config.hfToken}` }
        });

        if (res.ok) {
            const data = await res.json();
            apiQuestions = data.rows.map(item => {
                const row = item.row;
                const options = [row['Correct Answer'], row['Incorrect Answer 1'], row['Incorrect Answer 2'], row['Incorrect Answer 3']].sort(() => Math.random() - 0.5);
                return {
                    id: item.row_idx,
                    question: row['Question'],
                    subject: row['Subdomain'] || "Science",
                    emoji: "🔬",
                    options: { A: options[0], B: options[1], C: options[2], D: options[3] },
                    correct_letter: String.fromCharCode(65 + options.indexOf(row['Correct Answer'])),
                    explanation: row['Explanation']
                };
            });
        }
    } catch (err) {
        console.warn("API unreachable. Relying completely on strict local fallbacks.");
    }

    // STRICT FILTERING LOGIC
    let combined = [...apiQuestions, ...getStrictFallbacks()];
    let finalSelection = [];

    if (topic && topic !== 'Random') {
        // Force strict matching.
        let strictFiltered = combined.filter(q => q.subject.toLowerCase().includes(topic.toLowerCase()));
        
        // Remove duplicates just in case
        let uniqueFiltered = Array.from(new Set(strictFiltered.map(q => q.question)))
            .map(question => strictFiltered.find(q => q.question === question));

        finalSelection = uniqueFiltered.sort(() => Math.random() - 0.5).slice(0, 10);
    } else {
        // If Random, just grab 10 from anywhere
        let uniqueAll = Array.from(new Set(combined.map(q => q.question)))
            .map(question => combined.find(q => q.question === question));
            
        finalSelection = uniqueAll.sort(() => Math.random() - 0.5).slice(0, 10);
    }

    // Return directly to Vercel memory instead of writing to disk
    return finalSelection;
}

function getStrictFallbacks() {
    // 30 Guaranteed Questions
    return [
        // --- PHYSICS (10) ---
        { subject: "Physics", question: "What is the primary implication of Bell's Theorem?", correct_letter: "A", explanation: "It proves quantum mechanics relies on non-locality.", options: {A: "Non-local hidden variables", B: "Faster than light travel", C: "Cat states", D: "Measurement error"}},
        { subject: "Physics", question: "Hawking radiation is primarily caused by?", correct_letter: "C", explanation: "Quantum fluctuations at the event horizon.", options: {A: "Black hole explosions", B: "Nuclear fusion", C: "Quantum fluctuations at the horizon", D: "Dark matter decay"}},
        { subject: "Physics", question: "What defines a topological insulator?", correct_letter: "D", explanation: "It behaves as an insulator in its interior but conducts on its surface.", options: {A: "Total vacuum", B: "Superconductivity", C: "Metallic bulk", D: "Insulating bulk, conducting surface"}},
        { subject: "Physics", question: "What is a characteristic of the Zeeman effect?", correct_letter: "A", explanation: "The splitting of a spectral line into several components in the presence of a static magnetic field.", options: {A: "Spectral line splitting in a B-field", B: "Color change", C: "Mass increase", D: "Velocity shift"}},
        { subject: "Physics", question: "In Compton scattering, what happens to the scattered photon?", correct_letter: "B", explanation: "It loses energy and its wavelength increases.", options: {A: "Wavelength decreases", B: "Wavelength increases", C: "It converts to an electron", D: "It travels faster"}},
        { subject: "Physics", question: "The Aharonov-Bohm effect demonstrates the physical significance of?", correct_letter: "C", explanation: "Electromagnetic potentials over fields in quantum mechanics.", options: {A: "Gravity", B: "Strong force", C: "Electromagnetic potentials", D: "Dark energy"}},
        { subject: "Physics", question: "Noether's theorem states that every differentiable symmetry of the action of a physical system generates:", correct_letter: "A", explanation: "A corresponding conservation law.", options: {A: "A conservation law", B: "A new particle", C: "A singularity", D: "Time dilation"}},
        { subject: "Physics", question: "The Casimir effect is a macroscopic manifestation of?", correct_letter: "D", explanation: "Vacuum energy from quantized fields.", options: {A: "Magnetic monopoles", B: "String theory", C: "General relativity", D: "Vacuum energy"}},
        { subject: "Physics", question: "What characterizes a Bose-Einstein Condensate?", correct_letter: "B", explanation: "A large fraction of bosons occupy the lowest quantum state.", options: {A: "Fermion pairing", B: "Macroscopic quantum state", C: "Plasma generation", D: "Infinite density"}},
        { subject: "Physics", question: "Larmor precession describes?", correct_letter: "A", explanation: "The precession of the magnetic moment of an object about an external magnetic field.", options: {A: "Magnetic moment in a B-field", B: "Planetary orbits", C: "Electron spinning", D: "Quark confinement"}},

        // --- CHEMISTRY (10) ---
        { subject: "Chemistry", question: "What is the thermodynamic consequence of the Jahn-Teller effect?", correct_letter: "B", explanation: "Geometric distortion to lower the symmetry and energy.", options: {A: "Spin pairing", B: "Geometric distortion", C: "Symmetry stability", D: "d-d suppression"}},
        { subject: "Chemistry", question: "Identify the strongest Bronsted acid among the following.", correct_letter: "A", explanation: "HClO4 is the strongest due to resonance stabilization of its conjugate base.", options: {A: "HClO4", B: "H2SO4", C: "HCl", D: "HNO3"}},
        { subject: "Chemistry", question: "The primary chemical byproduct of the Haber process is?", correct_letter: "B", explanation: "The process combines nitrogen and hydrogen to produce ammonia.", options: {A: "Nitrogen", B: "Ammonia", C: "Nitric Acid", D: "Hydrogen"}},
        { subject: "Chemistry", question: "What does Le Chatelier's Principle predict?", correct_letter: "C", explanation: "A system at equilibrium will shift to counteract a change.", options: {A: "Energy conservation", B: "Electron spin", C: "System opposes change", D: "Gas expansion"}},
        { subject: "Chemistry", question: "A Diels-Alder reaction is best classified as?", correct_letter: "A", explanation: "It is a [4+2] cycloaddition reaction.", options: {A: "A cycloaddition", B: "A substitution", C: "An elimination", D: "A polymerization"}},
        { subject: "Chemistry", question: "What is the primary function of a Grignard reagent?", correct_letter: "D", explanation: "It acts as a strong nucleophile to form carbon-carbon bonds.", options: {A: "Oxidation", B: "Reduction", C: "Radical initiation", D: "Nucleophilic addition"}},
        { subject: "Chemistry", question: "Markovnikov's rule is primarily driven by?", correct_letter: "B", explanation: "The relative stability of carbocation intermediates.", options: {A: "Steric hindrance", B: "Carbocation stability", C: "Electronegativity", D: "Isotope effects"}},
        { subject: "Chemistry", question: "An SN2 reaction on a chiral center results in?", correct_letter: "C", explanation: "A concerted backside attack leads to stereochemical inversion.", options: {A: "Racemization", B: "Retention of configuration", C: "Stereochemical inversion", D: "Elimination"}},
        { subject: "Chemistry", question: "A negative change in Gibbs Free Energy indicates?", correct_letter: "A", explanation: "The reaction is thermodynamically spontaneous.", options: {A: "Spontaneous reaction", B: "Endothermic reaction", C: "System at equilibrium", D: "Decrease in entropy"}},
        { subject: "Chemistry", question: "VSEPR theory determines molecular geometry based on?", correct_letter: "D", explanation: "Valence shell electron pair repulsion.", options: {A: "Nuclear forces", B: "Orbital hybridization", C: "Electronegativity differences", D: "Electron repulsion"}},

        // --- BIOLOGY (10) ---
        { subject: "Biology", question: "Which enzyme relieves torsional strain ahead of the replication fork?", correct_letter: "C", explanation: "DNA Gyrase reduces supercoiling.", options: {A: "Helicase", B: "Primase", C: "DNA Gyrase", D: "Ligase"}},
        { subject: "Biology", question: "What is the primary function of the spliceosome?", correct_letter: "B", explanation: "It removes introns from pre-mRNA.", options: {A: "Protein translation", B: "Intron removal", C: "5' Capping", D: "Polyadenylation"}},
        { subject: "Biology", question: "What is the biochemical role of reverse transcriptase?", correct_letter: "A", explanation: "It synthesizes DNA from an RNA template.", options: {A: "RNA to DNA transcription", B: "DNA to RNA transcription", C: "Protein synthesis", D: "Lipid breakdown"}},
        { subject: "Biology", question: "In its native bacterial environment, what is the function of CRISPR?", correct_letter: "D", explanation: "It acts as an adaptive immune system against phages.", options: {A: "Photosynthesis regulation", B: "Meiotic cell division", C: "Protein folding", D: "Adaptive viral defense"}},
        { subject: "Biology", question: "Polymerase Chain Reaction (PCR) is used primarily for?", correct_letter: "B", explanation: "Amplifying specific DNA sequences.", options: {A: "RNA sequencing", B: "DNA amplification", C: "Protein crystallization", D: "Cell cloning"}},
        { subject: "Biology", question: "Okazaki fragments are formed during the synthesis of?", correct_letter: "A", explanation: "They form on the lagging strand during DNA replication.", options: {A: "The lagging strand", B: "The leading strand", C: "mRNA transcripts", D: "Ribosomal RNA"}},
        { subject: "Biology", question: "Where does the Krebs cycle take place in a eukaryotic cell?", correct_letter: "C", explanation: "It occurs in the mitochondrial matrix.", options: {A: "Cytosol", B: "Nucleus", C: "Mitochondrial matrix", D: "Golgi apparatus"}},
        { subject: "Biology", question: "What is the primary cellular function of the ribosome?", correct_letter: "D", explanation: "Ribosomes translate mRNA into amino acid chains.", options: {A: "Energy production", B: "Waste degradation", C: "DNA storage", D: "Protein translation"}},
        { subject: "Biology", question: "Apoptosis is defined as?", correct_letter: "A", explanation: "It is the process of programmed cell death.", options: {A: "Programmed cell death", B: "Uncontrolled proliferation", C: "Cellular respiration", D: "Phagocytosis"}},
        { subject: "Biology", question: "The rising phase of a neuronal action potential is driven by?", correct_letter: "B", explanation: "The rapid influx of sodium ions.", options: {A: "Potassium efflux", B: "Sodium influx", C: "Calcium storage", D: "Chloride channels opening"}}
    ];
}