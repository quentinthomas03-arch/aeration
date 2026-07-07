// export-word.js - Export du rapport de contrôle aération en Word
// Structure : titre mission, puis pour chaque type d'installation renseigné,
// un sous-titre + un tableau Champ/Valeur par installation.

function exportRapportWord() {
  var m = getCurrentMission();
  if (!m) { alert('Aucune mission sélectionnée'); return; }
  if (typeof docx === 'undefined') {
    alert('Bibliothèque Word non chargée. Rechargez l\u2019application.');
    return;
  }
  try {
    var doc = buildRapportDoc(m);
    docx.Packer.toBlob(doc).then(function (blob) {
      var rawName = (m.clientSite || 'Mission').replace(/[^a-zA-Z0-9\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ef\u00ee\u00f4\u00f9\u00fb\u00fc\u00e7\s-]/g, '').trim();
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = rawName + '_controle_aeration.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }).catch(function (err) {
      alert('Erreur lors de la génération du document Word.\n' + err.message);
    });
  } catch (err) {
    alert('Erreur lors de l\u2019export Word.\n' + err.message);
  }
}

function buildRapportDoc(m) {
  var D = docx;
  var BLUE = '0066B3';
  var LIGHT = 'E8F1F8';

  var children = [];

  // — En-tête mission —
  children.push(new D.Paragraph({
    spacing: { after: 120 },
    children: [new D.TextRun({ text: 'Rapport de contrôle aération', bold: true, size: 40, font: 'Arial', color: BLUE })]
  }));
  children.push(new D.Paragraph({
    spacing: { after: 60 },
    children: [new D.TextRun({ text: 'Client / Site : ' + (m.clientSite || '—'), size: 24, font: 'Arial' })]
  }));
  children.push(new D.Paragraph({
    spacing: { after: 60 },
    children: [new D.TextRun({ text: 'Contrôleur : ' + (m.controleur || '—'), size: 24, font: 'Arial' })]
  }));
  children.push(new D.Paragraph({
    spacing: { after: 240 },
    children: [new D.TextRun({ text: 'Date du contrôle : ' + (m.dateControle || '—'), size: 24, font: 'Arial' })]
  }));

  var borders = {
    top: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE },
    bottom: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE },
    left: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE },
    right: { style: D.BorderStyle.SINGLE, size: 4, color: BLUE }
  };

  function labelCell(text) {
    return new D.TableCell({
      width: { size: 3800, type: D.WidthType.DXA },
      borders: borders,
      shading: { fill: LIGHT, type: D.ShadingType.CLEAR },
      children: [new D.Paragraph({
        children: [new D.TextRun({ text: text, bold: true, size: 18, font: 'Arial' })]
      })]
    });
  }

  function valueCell(text) {
    return new D.TableCell({
      width: { size: 5560, type: D.WidthType.DXA },
      borders: borders,
      children: [new D.Paragraph({
        children: [new D.TextRun({ text: text, size: 18, font: 'Arial' })]
      })]
    });
  }

  function sectionRow(text) {
    return new D.TableRow({
      children: [new D.TableCell({
        columnSpan: 2,
        width: { size: 9360, type: D.WidthType.DXA },
        borders: borders,
        shading: { fill: BLUE, type: D.ShadingType.CLEAR },
        children: [new D.Paragraph({
          children: [new D.TextRun({ text: text, bold: true, size: 18, font: 'Arial', color: 'FFFFFF' })]
        })]
      })]
    });
  }

  var hasContent = false;

  INSTALLATION_TYPES.forEach(function (t) {
    var list = (m.installations && m.installations[t.id]) || [];
    if (list.length === 0) return;
    hasContent = true;

    children.push(new D.Paragraph({
      spacing: { before: 360, after: 120 },
      children: [new D.TextRun({ text: t.label + ' (' + list.length + ')', bold: true, size: 28, font: 'Arial', color: BLUE })]
    }));

    list.forEach(function (inst, idx) {
      var rows = [];
      t.fields.forEach(function (f) {
        if (f.type === 'photo') return; // photos non incluses dans cette version
        if (f.type === 'section') {
          var r = sectionRow(f.label);
          r.__section = true;
          rows.push(r);
          return;
        }
        var val = inst.data[f.key];
        if (val === undefined || val === null || val === '' ||
            (Array.isArray(val) && val.length === 0)) return;
        if (Array.isArray(val)) val = val.join(', ');
        rows.push(new D.TableRow({ children: [labelCell(f.label), valueCell(String(val))] }));
      });

      // supprimer les lignes de section non suivies de données
      var finalRows = [];
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].__section && (i === rows.length - 1 || rows[i + 1].__section)) continue;
        finalRows.push(rows[i]);
      }

      if (finalRows.length === 0) return;

      children.push(new D.Paragraph({
        spacing: { before: 120, after: 60 },
        children: [new D.TextRun({ text: 'Installation ' + (idx + 1), bold: true, size: 20, font: 'Arial' })]
      }));
      children.push(new D.Table({
        width: { size: 9360, type: D.WidthType.DXA },
        columnWidths: [3800, 5560],
        rows: finalRows
      }));
    });
  });

  if (!hasContent) {
    children.push(new D.Paragraph({
      children: [new D.TextRun({ text: 'Aucune installation renseignée.', size: 20, font: 'Arial' })]
    }));
  }

  return new D.Document({
    sections: [{
      properties: {
        page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } }
      },
      children: children
    }]
  });
}

console.log('✓ Export Word chargé');
