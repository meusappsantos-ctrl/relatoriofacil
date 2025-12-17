import { jsPDF } from 'jspdf';
import { ReportData, ReportTemplate, ReportPhoto } from '../types';

// Helper to strip emojis and icons from text for professional PDF output
const cleanText = (str: string | undefined): string => {
  if (!str) return '';
  // Regex to remove emojis and symbols, keeping standard text and punctuation
  return str.replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
            .trim();
};

export const generatePDF = async (template: ReportTemplate, data: ReportData) => {
  const doc = new jsPDF();
  
  // Professional / Clean Palette
  const colors = {
    primary: [30, 41, 59],      // Slate 800
    text: [51, 65, 85],         // Slate 700
    label: [100, 116, 139],     // Slate 500
    accent: [37, 99, 235],      // Blue 600
    lightGray: [241, 245, 249], // Slate 100
    white: [255, 255, 255],
    border: [226, 232, 240]     // Slate 200
  };

  let yPos = 0;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15; // Slightly larger margin for better readability
  const contentWidth = pageWidth - (margin * 2);

  // Helper: Set Color
  const setFill = (c: number[]) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: number[]) => doc.setDrawColor(c[0], c[1], c[2]);

  // --- HEADER ---
  setFill(colors.accent);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setText(colors.white);
  doc.text("RELATÓRIO DE EXECUÇÃO", margin, 18);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text("AUTOMAÇÃO – MINA SERRA SUL", margin, 26);
  
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 18, { align: 'right' });

  yPos = 45;

  // --- LAYOUT HELPERS ---
  
  // Draw Section Header
  const drawSectionTitle = (title: string, y: number) => {
    // Gray background bar
    setFill(colors.lightGray);
    doc.rect(margin, y, contentWidth, 7, 'F');
    
    // Text
    setText(colors.primary);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(cleanText(title).toUpperCase(), margin + 2, y + 4.5);
    return y + 12;
  };

  // Draw Field with Dynamic Height Calculation
  const drawField = (label: string, value: string, x: number, y: number, w: number): number => {
    const safeValue = cleanText(value) || "-";
    
    // Label
    setText(colors.label);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(cleanText(label).toUpperCase(), x, y);
    
    // Value wrapping
    setText(colors.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const splitVal = doc.splitTextToSize(safeValue, w);
    doc.text(splitVal, x, y + 5);
    
    // Return height used by this field
    return (splitVal.length * 4.5) + 4; 
  };

  // --- 1. DADOS DA ORDEM ---
  yPos = drawSectionTitle("DADOS DA ORDEM", yPos);
  
  // Row 1: OM Number (Small) | Description (Large)
  const omNumW = 40;
  const omDescW = contentWidth - omNumW - 5;
  
  const hOM = drawField("Nº OM", data.omNumber, margin, yPos, omNumW);
  const hDesc = drawField("DESCRIÇÃO DA OM", template.omDescription, margin + omNumW + 5, yPos, omDescW);
  
  yPos += Math.max(hOM, hDesc) + 6;

  // --- 2. DETALHES DA EXECUÇÃO ---
  yPos = drawSectionTitle("DETALHES DA EXECUÇÃO", yPos);

  // 3 Column Grid
  const colGap = 5;
  const colW = (contentWidth - (colGap * 2)) / 3;
  const col1 = margin;
  const col2 = margin + colW + colGap;
  const col3 = margin + (colW * 2) + (colGap * 2);

  // Row 1
  let h1 = drawField("DATA", data.date.split('-').reverse().join('/'), col1, yPos, colW);
  let h2 = drawField("EQUIPAMENTO", data.equipment, col2, yPos, colW);
  let h3 = drawField("TIPO DE ATIVIDADE", data.activityType, col3, yPos, colW);
  
  yPos += Math.max(h1, h2, h3) + 6;

  // Row 2
  h1 = drawField("HORÁRIO INICIAL", data.startTime, col1, yPos, colW);
  h2 = drawField("HORÁRIO FINAL", data.endTime, col2, yPos, colW);
  // Empty 3rd column
  
  yPos += Math.max(h1, h2) + 8;

  // --- 3. ATIVIDADE EXECUTADA ---
  yPos = drawSectionTitle("ATIVIDADE EXECUTADA", yPos);
  
  const activityText = cleanText(data.activityExecuted || template.activityExecuted);
  setText(colors.text);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  const splitActivity = doc.splitTextToSize(activityText, contentWidth);
  doc.text(splitActivity, margin, yPos);
  
  yPos += (splitActivity.length * 5) + 8;

  // --- 3.1 OBSERVAÇÕES (Se houver) ---
  if (data.observations && cleanText(data.observations).length > 0) {
    yPos = drawSectionTitle("OBSERVAÇÕES", yPos);
    
    const obsText = cleanText(data.observations);
    const splitObs = doc.splitTextToSize(obsText, contentWidth);
    doc.text(splitObs, margin, yPos);
    
    yPos += (splitObs.length * 5) + 8;
  }

  // --- 4. STATUS ---
  // Ensure we have space, else add page
  if (yPos > 240) {
      doc.addPage();
      yPos = 20;
  }

  yPos = drawSectionTitle("STATUS E PENDÊNCIAS", yPos);

  // Status Row - Using Simple Text/Box layout instead of colored badges for cleaner look
  setDraw(colors.border);
  setFill(colors.white);
  
  const statusBoxW = contentWidth / 3;
  
  const drawStatusItem = (label: string, value: string, x: number, y: number) => {
      setText(colors.label);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text(cleanText(label), x, y);
      
      setText(colors.primary);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold"); // Bold for status value
      doc.text(cleanText(value).toUpperCase(), x, y + 5);
  };

  drawStatusItem("OM FINALIZADA?", data.isFinished ? "SIM" : "NÃO", col1, yPos);
  drawStatusItem("PENDÊNCIAS?", data.hasPending ? "SIM" : "NÃO", col2, yPos);
  drawStatusItem("DESVIO IAMO?", data.iamoDeviation ? "SIM" : "NÃO", col3, yPos);
  
  yPos += 12;

  // Conditional Status Details
  if (data.iamoDeviation) {
     const label = "DETALHES DO DESVIO IAMO:";
     const val = `Período: ${data.iamoPeriod || '-'} | Motivo: ${data.iamoReason || '-'}`;
     yPos += drawField(label, val, margin, yPos, contentWidth) + 4;
  }

  if (data.hasPending && data.pendingDescription) {
     const label = "DESCRIÇÃO DA PENDÊNCIA:";
     const val = data.pendingDescription;
     yPos += drawField(label, val, margin, yPos, contentWidth) + 4;
  }

  // --- 5. EQUIPE ---
  yPos += 4; // Extra spacing
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  yPos = drawSectionTitle("EQUIPE TÉCNICA", yPos);
  
  h1 = drawField("TURNO", data.team, col1, yPos, colW);
  h2 = drawField("CENTRO DE TRABALHO", data.workCenter, col2, yPos, colW * 2 + colGap); // Span 2 cols
  
  yPos += Math.max(h1, h2) + 6;
  
  drawField("TÉCNICOS", data.technicians, margin, yPos, contentWidth);

  // --- 6. REGISTROS FOTOGRÁFICOS ---
  if (data.photos && data.photos.length > 0) {
    doc.addPage();
    
    // Header
    setFill(colors.accent);
    doc.rect(0, 0, pageWidth, 25, 'F');
    setText(colors.white);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REGISTROS FOTOGRÁFICOS", margin, 17);

    let imgY = 40;
    const imgSize = 80;
    const gap = 20;
    const maxPageY = 270; 
    
    data.photos.forEach((photoEntry, index) => {
       const photo: ReportPhoto = typeof photoEntry === 'string' 
          ? { uri: photoEntry, caption: '' } 
          : photoEntry;

       const isRightColumn = index % 2 !== 0;
       const x = isRightColumn ? margin + imgSize + gap : margin;
       
       let captionLines: string[] = [];
       if (photo.caption) {
           doc.setFontSize(9);
           // Strip emojis from caption
           captionLines = doc.splitTextToSize(cleanText(photo.caption), imgSize);
       }
       const itemTotalHeight = imgSize + (captionLines.length * 4) + 10;

       if (imgY + itemTotalHeight > maxPageY) {
         doc.addPage();
         imgY = 20;
       }

       // Image Border
       setDraw(colors.border);
       doc.setLineWidth(0.5);
       doc.rect(x - 1, imgY - 1, imgSize + 2, imgSize + 2);
       
       try {
         doc.addImage(photo.uri, undefined, x, imgY, imgSize, imgSize, undefined, 'FAST');
       } catch (e) {
         setFill(colors.lightGray);
         doc.rect(x, imgY, imgSize, imgSize, 'F');
       }

       if (photo.caption && captionLines.length > 0) {
           setText(colors.text);
           doc.setFont("helvetica", "normal");
           doc.setFontSize(9);
           doc.text(captionLines, x, imgY + imgSize + 6);
       }

       if (isRightColumn) {
         imgY += imgSize + gap + 15; 
       }
    });
  }

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setText(colors.label);
    doc.setFontSize(8);
    // Right aligned page number
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 290, { align: 'right' });
    // Left aligned credit
    doc.text("Relatório Gerado via Apprelatoriofacil criado por Rafael", margin, 290);
  }

  const sanitizedDesc = cleanText(template.omDescription)
    .replace(/[^a-z0-9]/gi, '_') 
    .replace(/_+/g, '_') 
    .substring(0, 50); 
  
  const safeName = `Relatorio_OM_${cleanText(data.omNumber) || 'NA'}_${sanitizedDesc}.pdf`;
  
  doc.save(safeName);
};