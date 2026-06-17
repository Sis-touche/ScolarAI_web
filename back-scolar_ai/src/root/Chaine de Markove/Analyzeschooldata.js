'use strict';

const XLSX = require('xlsx');
const { DirectedGraph } = require('graphology');

// =============================================================================
// CONFIGURATION PAR DÉFAUT
// =============================================================================
const DEFAULT_MATIERE_GROUPS = {
    scientifique:    ['Mathématiques', 'Physique-Chimie', 'SVT', 'Informatique', 'Sciences Physiques'],
    litteraire:      ['Français', 'Philosophie', 'Histoire-Géographie', 'Anglais', 'Malagasy'],
    economique:      ['SES', 'Économie', 'Comptabilité', 'Mathématiques Appliquées'],
    technique_btp:   ['Résistance des Matériaux', 'Dessin Technique', 'Soudure', 'Béton Armé',
                      'Topographie', 'Charpente Métallique', 'Structure Métallique', 'Maçonnerie'],
    technique_elec:  ['Électrotechnique', 'Automatisme', 'Circuits Électriques',
                      'Électronique', 'Électricité Industrielle'],
    technique_meca:  ['Mécanique Générale', 'Usinage', 'Tournage', 'Fraisage',
                      'Résistance des Matériaux', 'Construction Mécanique'],
    technique_info:  ['Algorithmique', 'Programmation', 'Réseaux', 'Base de Données',
                      'Développement Web', 'Systèmes d\'Exploitation'],
};

// =============================================================================
// UTILITAIRES
// =============================================================================

const normalize = (str = '') =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const calculateAge = (birthDateStr, referenceDate = new Date('2026-09-01')) => {
    if (!birthDateStr) return null;
    const birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) return null;
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const m = referenceDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) age--;
    return age;
};

const getTheoreticalAge = (classe = '') => {
    const n = normalize(classe);
    if (n.includes('6eme') || n.includes('6ieme') || n.match(/\b6e\b/)) return 11;
    if (n.includes('5eme') || n.includes('5ieme') || n.match(/\b5e\b/)) return 12;
    if (n.includes('4eme') || n.includes('4ieme') || n.match(/\b4e\b/)) return 13;
    if (n.includes('3eme') || n.includes('3ieme') || n.match(/\b3e\b/)) return 14;
    if (n.includes('2nde') || n.includes('seconde')) return 15;
    if (n.includes('tle')  || n.includes('terminale') || n.match(/\bterm\b/)) return 17;
    if (n.includes('premiere') || n.includes('1ere') || n.includes('1re') || n.includes('1ère') || n.match(/\b1e\b/)) return 16;
    if (n.includes('cap')) {
        if (n.match(/\b(1|1ere|1re|premiere)\b/)) return 15;
        if (n.match(/\b(2|2eme|2e|deuxieme)\b/)) return 16;
        return 15;
    }
    if (n.includes('bep')) {
        if (n.match(/\b(1|1ere)\b/)) return 15;
        if (n.match(/\b(2|2eme)\b/)) return 16;
        return 15;
    }
    if (n.includes('bac pro') || n.includes('bacpro')) {
        if (n.match(/\b(1|1ere|seconde)\b/)) return 15;
        if (n.match(/\b(2|1ere|premiere)\b/)) return 16;
        if (n.match(/\b(3|tle|terminale)\b/)) return 17;
        return 16;
    }
    if (n.includes('bts')) {
        if (n.match(/\b(1|1ere)\b/)) return 18;
        if (n.match(/\b(2|2eme)\b/)) return 19;
        return 18;
    }
    if (n.includes('btp') || n.includes('pro') || n.includes('tech')) {
        if (n.match(/\b(1|1ere|1re|premiere|1ere\s*annee|1\s*annee)\b/)) return 15;
        if (n.match(/\b(2|2eme|2e|deuxieme|2eme\s*annee|2\s*annee)\b/)) return 16;
        if (n.match(/\b(3|3eme|3e|troisieme|3eme\s*annee|3\s*annee)\b/)) return 17;
        return 16;
    }
    const yearMatch = n.match(/(\d)\s*(ere|eme|e|ieme|annee|an|year)/);
    if (yearMatch) return 14 + parseInt(yearMatch[1]);
    return 16;
};

const autoClassifyMatiere = (nomMatiere = '') => {
    const n = normalize(nomMatiere);
    if (/soudure|metal|structure|beton|btp|macon|charpente|topograph|resistances?\s*des\s*mat|rdm|dessin\s*tech|topo/.test(n))
        return 'technique_btp';
    if (/elec|electronique|automatisme|circuit|courant|electro/.test(n))
        return 'technique_elec';
    if (/mecani|usinage|tournage|fraisage|construction\s*meca|moteur/.test(n))
        return 'technique_meca';
    if (/algo|programm|reseau|base\s*de\s*donn|developpement|dev\s*web|systeme/.test(n))
        return 'technique_info';
    if (/math|physique|chimie|svt|biologie|geologie|sciences/.test(n))
        return 'scientifique';
    if (/francais|philo|histoire|geographie|anglais|malagasy|espagnol|allemand|lettre/.test(n))
        return 'litteraire';
    if (/economie|ses|compta|gestion|finance|marketing|commerce/.test(n))
        return 'economique';
    return 'autre';
};

const determineOrientation = (studentNotes, matiereGroups) => {
    const scores = {};
    const counts = {};

    Object.entries(studentNotes).forEach(([matiere, note]) => {
        let groupe = null;
        for (const [grp, matieres] of Object.entries(matiereGroups)) {
            if (matieres.some(m => normalize(m) === normalize(matiere))) {
                groupe = grp;
                break;
            }
        }
        if (!groupe) groupe = autoClassifyMatiere(matiere);
        scores[groupe] = (scores[groupe] || 0) + note;
        counts[groupe] = (counts[groupe] || 0) + 1;
    });

    const moyennes = {};
    Object.keys(scores).forEach(grp => {
        moyennes[grp] = parseFloat((scores[grp] / counts[grp]).toFixed(2));
    });

    const candidats = Object.entries(moyennes).filter(([g]) => g !== 'autre');
    const source = candidats.length > 0 ? candidats : Object.entries(moyennes);
    const profilDominant = source.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Indéterminé';

    return {
        profilDominant: profilDominant.charAt(0).toUpperCase() + profilDominant.slice(1),
        moyennes
    };
};

const pearsonCorrelation = (x, y) => {
    const n = x.length;
    if (n < 2) return null;
    const sumX  = x.reduce((a, b) => a + b, 0);
    const sumY  = y.reduce((a, b) => a + b, 0);
    const sumX2 = x.reduce((a, b) => a + b * b, 0);
    const sumY2 = y.reduce((a, b) => a + b * b, 0);
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
    const num   = n * sumXY - sumX * sumY;
    const den   = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
    return den === 0 ? 0 : parseFloat((num / den).toFixed(3));
};

const getState = (note) => {
    if (note >= 16) return 'A';
    if (note >= 12) return 'B';
    if (note >= 10) return 'C';
    return 'D';
};

// =============================================================================
// DIAGNOSTIC INDIVIDUEL AMÉLIORÉ – 100 % basé sur les données
// =============================================================================
const analyzeCriticalStudent = (student, globalMatieresMoyennes) => {
    const notesArray = Object.entries(student.notes);

    // Points faibles (<10) triés par note croissante
    const pointsFaibles = notesArray
        .filter(([, note]) => note < 10)
        .map(([matiere, note]) => ({ matiere, note }))
        .sort((a, b) => a.note - b.note);

    // Écart le plus négatif par rapport à la moyenne de la classe
    const ecartsNegatifs = notesArray.map(([matiere, note]) => {
        const moyenneClasse = globalMatieresMoyennes[matiere] ?? 10;
        return {
            matiere,
            noteEleve: note,
            moyenneClasse,
            ecart: parseFloat((note - moyenneClasse).toFixed(2))
        };
    }).sort((a, b) => a.ecart - b.ecart);

    const matiereLePlusEnRetard = ecartsNegatifs[0] ?? null;

    // Analyse Markov personnelle (basée uniquement sur la séquence réelle)
    const seq = student.sequenceNotes;
    let stagnationDansD   = 0;
    let progressionDepuisD = 0;

    for (let i = 0; i < seq.length - 1; i++) {
        const curr = getState(seq[i].note);
        const next = getState(seq[i + 1].note);
        if (curr === 'D' && next === 'D') stagnationDansD++;
        if (curr === 'D' && next !== 'D') progressionDepuisD++;
    }

    // Construction du diagnostic textuel justifié
    let diagnosticTexte = '';

    if (seq.length < 2) {
        diagnosticTexte = 'Données insuffisantes pour une analyse de trajectoire.';
    } else {
        // Justification basée sur la stagnation
        if (stagnationDansD > seq.length * 0.5) {
            diagnosticTexte = `Stagnation critique : l'élève enchaîne ${stagnationDansD} transitions consécutives en échec (état D) sur ${seq.length - 1} transitions possibles, ce qui représente plus de la moitié du parcours. Risque de décrochage avéré.`;
        } else if (progressionDepuisD > stagnationDansD) {
            diagnosticTexte = `Trajectoire de redressement : ${progressionDepuisD} transitions depuis l'état D vers un état supérieur, contre seulement ${stagnationDansD} stagnations en D. L'élève montre une dynamique de progression.`;
        } else {
            diagnosticTexte = `Trajectoire instable : ${stagnationDansD} stagnation(s) en D, ${progressionDepuisD} progression(s) hors D. Les transitions sont fréquentes entre états, sans tendance nette.`;
        }
    }

    // Ajout des points faibles concrets
    if (pointsFaibles.length > 0) {
        const matieresStr = pointsFaibles.map(p => `${p.matiere} (${p.note}/20)`).join(', ');
        diagnosticTexte += ` Matières en difficulté (<10) : ${matieresStr}.`;
    }

    // Ajout de l'écart le plus marquant
    if (matiereLePlusEnRetard) {
        diagnosticTexte += ` Écart maximal avec la classe : ${matiereLePlusEnRetard.matiere} (note élève : ${matiereLePlusEnRetard.noteEleve}/20, moyenne de la classe : ${matiereLePlusEnRetard.moyenneClasse}/20, écart : ${matiereLePlusEnRetard.ecart}).`;
    }

    return {
        pointsFaibles,
        matiereLePlusEnRetard,
        diagnosticMarkov: diagnosticTexte   // le champ conserve le nom "diagnosticMarkov" pour compatibilité
    };
};

// =============================================================================
// FONCTION PRINCIPALE (inchangée, sauf le retour qui contient les diagnostics enrichis)
// =============================================================================
const analyzeSchoolData = (fileBuffer, config = {}) => {
    const matiereGroups  = config.matiereGroups  ?? DEFAULT_MATIERE_GROUPS;
    const referenceDate  = config.referenceDate  ?? new Date('2026-09-01');
    const topN           = config.topN           ?? 10;
    const seuilEchec     = config.seuilEchec     ?? 10;

    // -------------------------------------------------------------------------
    // 1. LECTURE EXCEL
    // -------------------------------------------------------------------------
    const workbook  = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rawData   = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rawData.length) {
        throw new Error('Le fichier Excel est vide ou mal formaté.');
    }

    const normalizeKey = (obj) => {
        const result = {};
        Object.entries(obj).forEach(([k, v]) => { result[normalize(k)] = v; });
        return result;
    };

    // -------------------------------------------------------------------------
    // 2. STRUCTURATION DES ÉLÈVES
    // -------------------------------------------------------------------------
    const studentsMap = {};

    rawData.forEach(rawRow => {
        const row = normalizeKey(rawRow);

        const classe  = row['classe']  ?? row['class']   ?? '';
        const numero  = row['numero']  ?? row['num']     ?? row['id'] ?? '';
        const nom     = row['nom']     ?? row['name']    ?? '';
        const prenom  = row['prenom']  ?? row['firstname'] ?? '';
        const matiere = row['nom du matiere'] ?? row['matiere'] ?? row['subject'] ?? row['nom_matiere'] ?? '';
        const note    = parseFloat(row['note'] ?? row['score'] ?? row['grade'] ?? 0);
        const birth   = row['date naissance'] ?? row['naissance'] ?? row['birthdate'] ?? row['ddn'] ?? null;
        const periode = row['periode'] ?? row['trimestre'] ?? row['semestre'] ?? null;

        if (!classe || !matiere || isNaN(note)) return;

        const key = `${normalize(classe)}_${numero}`;

        if (!studentsMap[key]) {
            studentsMap[key] = {
                nom,
                prenom,
                classe,
                numero,
                birthDate: birth,
                notes: {},
                sequenceNotes: []
            };
        }

        studentsMap[key].notes[matiere] = note;
        studentsMap[key].sequenceNotes.push({ matiere, note, periode });
    });

    const totalStudents = Object.values(studentsMap);

    if (!totalStudents.length) {
        throw new Error('Aucun élève valide trouvé. Vérifiez les noms de colonnes du fichier.');
    }

    totalStudents.forEach(s => {
        if (s.sequenceNotes.some(n => n.periode !== null)) {
            s.sequenceNotes.sort((a, b) => {
                if (a.periode === null) return 1;
                if (b.periode === null) return -1;
                return String(a.periode).localeCompare(String(b.periode), undefined, { numeric: true });
            });
        }
    });

    // -------------------------------------------------------------------------
    // 3. CALCUL DES ÂGES
    // -------------------------------------------------------------------------
    totalStudents.forEach(s => {
        s.age          = calculateAge(s.birthDate, referenceDate);
        s.ageTheorique = getTheoreticalAge(s.classe);
        if (s.age === null) {
            s.situationAge = 'Date de naissance manquante';
        } else if (s.age > s.ageTheorique + 1) {
            s.situationAge = 'Retard scolaire';
        } else if (s.age < s.ageTheorique) {
            s.situationAge = 'Avance scolaire';
        } else {
            s.situationAge = "À l'heure";
        }
    });

    // -------------------------------------------------------------------------
    // 4. MOYENNES GLOBALES PAR MATIÈRE
    // -------------------------------------------------------------------------
    const globalMatieresSums   = {};
    const globalMatieresCounts = {};

    totalStudents.forEach(s => {
        Object.entries(s.notes).forEach(([mat, note]) => {
            globalMatieresSums[mat]   = (globalMatieresSums[mat]   ?? 0) + note;
            globalMatieresCounts[mat] = (globalMatieresCounts[mat] ?? 0) + 1;
        });
    });

    const globalMatieresMoyennes = {};
    Object.keys(globalMatieresSums).forEach(mat => {
        globalMatieresMoyennes[mat] =
            parseFloat((globalMatieresSums[mat] / globalMatieresCounts[mat]).toFixed(2));
    });

    // -------------------------------------------------------------------------
    // 5. ENRICHISSEMENT DE CHAQUE ÉLÈVE
    // -------------------------------------------------------------------------
    const finalStudents = totalStudents.map(s => {
        const notesValues = Object.values(s.notes);
        const moyenneGenerale = notesValues.length
            ? parseFloat((notesValues.reduce((a, b) => a + b, 0) / notesValues.length).toFixed(2))
            : 0;

        const orientation  = determineOrientation(s.notes, matiereGroups);
        const critAnalysis = analyzeCriticalStudent(s, globalMatieresMoyennes);

        return {
            nom:                  s.nom,
            prenom:               s.prenom,
            classe:               s.classe,
            numero:               s.numero,
            age:                  s.age,
            ageTheorique:         s.ageTheorique,
            situationAge:         s.situationAge,
            moyenneGenerale,
            profilDominant:       orientation.profilDominant,
            moyennesParBloc:      orientation.moyennes,
            pointsFaibles:        critAnalysis.pointsFaibles,
            matiereLePlusEnRetard: critAnalysis.matiereLePlusEnRetard,
            diagnosticMarkov:     critAnalysis.diagnosticMarkov,   // texte justifié
            notes:                s.notes
        };
    });

    // ... (le reste de la fonction est inchangé, de la section 6 à 12) ...

    const topStudents = [...finalStudents]
        .sort((a, b) => b.moyenneGenerale - a.moyenneGenerale)
        .slice(0, topN);

    const criticalStudents = finalStudents.filter(s => s.moyenneGenerale < seuilEchec);

    const classesMap = {};
    finalStudents.forEach(s => {
        if (!classesMap[s.classe]) classesMap[s.classe] = { ages: [], moyennes: [] };
        if (s.age !== null) classesMap[s.classe].ages.push(s.age);
        classesMap[s.classe].moyennes.push(s.moyenneGenerale);
    });

    const statsParClasse = {};
    Object.entries(classesMap).forEach(([classe, data]) => {
        const ageMoyen = data.ages.length
            ? parseFloat((data.ages.reduce((a, b) => a + b, 0) / data.ages.length).toFixed(1))
            : null;
        const moyenneClasse = parseFloat(
            (data.moyennes.reduce((a, b) => a + b, 0) / data.moyennes.length).toFixed(2)
        );
        statsParClasse[classe] = { ageMoyen, moyenneClasse, effectif: data.moyennes.length };
    });

    const validStudents = finalStudents.filter(s => s.age !== null);
    const correlationAgeNotes = pearsonCorrelation(
        validStudents.map(s => s.age),
        validStudents.map(s => s.moyenneGenerale)
    );

    const matieresStats = {};
    finalStudents.forEach(s => {
        Object.entries(s.notes).forEach(([mat, note]) => {
            if (!matieresStats[mat]) matieresStats[mat] = { totalNotes: [], nbEchecs: 0 };
            matieresStats[mat].totalNotes.push(note);
            if (note < seuilEchec) matieresStats[mat].nbEchecs++;
        });
    });

    const matieresCritiques = Object.entries(matieresStats).map(([matiere, stats]) => {
        const moyenne    = parseFloat((stats.totalNotes.reduce((a, b) => a + b, 0) / stats.totalNotes.length).toFixed(2));
        const tauxEchec  = parseFloat(((stats.nbEchecs / stats.totalNotes.length) * 100).toFixed(1));
        const groupe     = autoClassifyMatiere(matiere);
        return { matiere, moyenne, tauxEchec, groupe };
    }).sort((a, b) => a.moyenne - b.moyenne);

    const states = ['A', 'B', 'C', 'D'];
    const transitionCounts = {};
    states.forEach(s1 => {
        transitionCounts[s1] = {};
        states.forEach(s2 => { transitionCounts[s1][s2] = 0; });
    });

    totalStudents.forEach(student => {
        const seq = student.sequenceNotes;
        for (let i = 0; i < seq.length - 1; i++) {
            const current = getState(seq[i].note);
            const next    = getState(seq[i + 1].note);
            transitionCounts[current][next]++;
        }
    });

    const transitionMatrix = {};
    states.forEach(s1 => {
        const total = Object.values(transitionCounts[s1]).reduce((a, b) => a + b, 0);
        transitionMatrix[s1] = {};
        states.forEach(s2 => {
            transitionMatrix[s1][s2] = total
                ? parseFloat((transitionCounts[s1][s2] / total).toFixed(3))
                : 0;
        });
    });

    const graph = new DirectedGraph();
    states.forEach(s => graph.addNode(s));
    states.forEach(s1 => {
        states.forEach(s2 => {
            if (transitionMatrix[s1][s2] > 0) {
                graph.addEdge(s1, s2, { weight: transitionMatrix[s1][s2] });
            }
        });
    });

    const nodeClassifications = {};
    states.forEach(s => {
        const selfLoop    = transitionMatrix[s][s];
        const goesOutside = graph.outNeighbors(s).some(t => t !== s && transitionMatrix[s][t] > 0.1);
        nodeClassifications[s] = (!goesOutside && selfLoop > 0.7)
            ? 'Récurrent (Puits)'
            : 'Transitoire';
    });

    return {
        topStudents,
        criticalStudents,
        allStudents:          finalStudents,
        statsParClasse,
        correlationAgeNotes,
        matieresCritiques,
        globalMatieresMoyennes,
        transitionMatrix,
        nodeClassifications,
        meta: {
            totalEleves:    finalStudents.length,
            totalMatieres:  Object.keys(globalMatieresMoyennes).length,
            totalClasses:   Object.keys(statsParClasse).length,
            seuilEchec,
            topN,
            referenceDate:  referenceDate.toISOString().split('T')[0]
        }
    };
};

module.exports = { analyzeSchoolData };