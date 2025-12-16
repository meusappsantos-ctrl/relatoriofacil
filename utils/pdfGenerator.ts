import jsPDF from 'jspdf';
import { ReportData, ReportTemplate, ReportPhoto } from '../types';

export const generatePDF = async (template: ReportTemplate, data: ReportData) => {
  const doc = new jsPDF();
  
  // Palette definition
  const colors = {
    primary: [15, 23, 42],      // Slate 900
    text: [51, 65, 85],         // Slate 700
    label: [100, 116, 139],     // Slate 500
    accent: [37, 99, 235],      // Blue 600
    light: [241, 245, 249],     // Slate 100
    white: [255, 255, 255],
    success: [22, 163, 74],     // Green 600
    danger: [220, 38, 38],      // Red 600
    warning: [217, 119, 6],     // Amber 600
  };

  let yPos = 0;
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const contentWidth = pageWidth - (margin * 2);

  // Helper: Set Color
  const setFill = (c: number[]) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c: number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c: number[]) => doc.setDrawColor(c[0], c[1], c[2]);

  // --- HEADER ---
  setFill(colors.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  setText(colors.white);
  doc.text("RELATÓRIO DE EXECUÇÃO", margin, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setText(colors.label); // Lighten for subtitle
  doc.setTextColor(203, 213, 225); // Slate 300 manually
  doc.text("AUTOMAÇÃO – MINA SERRA SUL", margin, 28);
  
  // Date in Header
  doc.setFontSize(10);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin, 20, { align: 'right' });

  yPos = 50;

  // --- SECTIONS HELPER ---
  const drawSectionTitle = (title: string, y: number) => {
    setFill(colors.light);
    doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
    setText(colors.primary);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), margin + 3, y + 5.5);
    return y + 14;
  };

  const drawField = (label: string, value: string, x: number, y: number, w: number) => {
    // Label
    setText(colors.label);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(label, x, y);
    
    // Value
    setText(colors.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const splitVal = doc.splitTextToSize(value || "-", w);
    doc.text(splitVal, x, y + 5);
    
    return (splitVal.length * 5); // Return height usage
  };

  // --- 1. DADOS DA ORDEM ---
  yPos = drawSectionTitle("DADOS DA ORDEM", yPos);
  
  drawField("Nº OM", data.omNumber, margin, yPos, 40);
  drawField("DESCRIÇÃO DA OM", template.omDescription, margin + 50, yPos, 120);
  
  yPos += 12; // Spacing

  // --- 2. DETALHES DA EXECUÇÃO ---
  yPos = drawSectionTitle("DETALHES DA EXECUÇÃO", yPos);

  // Grid Layout for Execution details
  const col1 = margin;
  const col2 = margin + 60;
  const col3 = margin + 120;
  
  drawField("DATA", data.date.split('-').reverse().join('/'), col1, yPos, 50);
  drawField("EQUIPAMENTO", data.equipment, col2, yPos, 50);
  drawField("TIPO DE ATIVIDADE", data.activityType, col3, yPos, 50);
  
  yPos += 12;

  drawField("HORÁRIO INICIAL", data.startTime, col1, yPos, 50);
  drawField("HORÁRIO FINAL", data.endTime, col2, yPos, 50);
  
  yPos += 14;

  // --- 3. ATIVIDADE EXECUTADA ---
  yPos = drawSectionTitle("ATIVIDADE EXECUTADA", yPos);
  
  const activityText = data.activityExecuted || template.activityExecuted;
  setText(colors.text);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const splitActivity = doc.splitTextToSize(activityText, contentWidth);
  doc.text(splitActivity, margin, yPos);
  
  yPos += (splitActivity.length * 5) + 8;

  // --- 3.1 OBSERVAÇÕES ---
  if (data.observations) {
    yPos = drawSectionTitle("OBSERVAÇÕES", yPos);
    
    setText(colors.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const splitObs = doc.splitTextToSize(data.observations, contentWidth);
    doc.text(splitObs, margin, yPos);
    
    yPos += (splitObs.length * 5) + 8;
  }

  // --- 4. STATUS E SEGURANÇA ---
  yPos = drawSectionTitle("STATUS E SEGURANÇA", yPos);

  const drawBadge = (label: string, value: string, color: number[], x: number, y: number) => {
    setFill(color);
    doc.roundedRect(x, y, 55, 14, 2, 2, 'F');
    
    // Inner Text
    setText(colors.white);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(label, x + 3, y + 5);
    
    doc.setFontSize(10);
    doc.text(value.toUpperCase(), x + 3, y + 10);
  };

  // Status Badges
  // Finished
  drawBadge(
    "OM FINALIZADA?", 
    data.isFinished ? "SIM" : "NÃO", 
    data.isFinished ? colors.success : colors.warning, 
    margin, 
    yPos
  );

  // Pending
  drawBadge(
    "PENDÊNCIAS?", 
    data.hasPending ? "SIM" : "NÃO", 
    data.hasPending ? colors.warning : colors.accent, 
    margin + 60, 
    yPos
  );

  // IAMO
  drawBadge(
    "DESVIO IAMO?", 
    data.iamoDeviation ? "SIM" : "NÃO", 
    data.iamoDeviation ? colors.danger : colors.success, 
    margin + 120, 
    yPos
  );

  yPos += 20;

  // IAMO Details if exists
  if (data.iamoDeviation) {
     setText(colors.danger);
     doc.setFontSize(9);
     doc.setFont("helvetica", "bold");
     doc.text(`DETALHES DO DESVIO:`, margin, yPos);
     
     setText(colors.text);
     doc.setFont("helvetica", "normal");
     const iamoDetails = `Período: ${data.iamoPeriod || '-'} | Motivo: ${data.iamoReason || '-'}`;
     const splitIamo = doc.splitTextToSize(iamoDetails, contentWidth);
     doc.text(splitIamo, margin, yPos + 5);
     yPos += (splitIamo.length * 5) + 8;
  }
  
  // Pending Details if exists
  if (data.hasPending && data.pendingDescription) {
     setText(colors.warning);
     doc.setFontSize(9);
     doc.setFont("helvetica", "bold");
     doc.text(`DETALHES DA PENDÊNCIA:`, margin, yPos);
     
     setText(colors.text);
     doc.setFont("helvetica", "normal");
     const splitPending = doc.splitTextToSize(data.pendingDescription, contentWidth);
     doc.text(splitPending, margin, yPos + 5);
     yPos += (splitPending.length * 5) + 8;
  }

  // --- 5. EQUIPE ---
  yPos = drawSectionTitle("EQUIPE TÉCNICA", yPos);
  
  drawField("TURNO", data.team, col1, yPos, 50);
  drawField("CENTRO DE TRABALHO", data.workCenter, col2, yPos, 80);
  
  yPos += 12;
  drawField("TÉCNICOS", data.technicians, col1, yPos, contentWidth);
  
  const techLines = doc.splitTextToSize(data.technicians || "", contentWidth);
  yPos += (techLines.length * 5) + 10;

  // --- 6. REGISTROS FOTOGRÁFICOS ---
  if (data.photos && data.photos.length > 0) {
    doc.addPage();
    
    // Header for Photos
    setFill(colors.primary);
    doc.rect(0, 0, pageWidth, 25, 'F');
    setText(colors.white);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("REGISTROS FOTOGRÁFICOS", margin, 16);

    let imgY = 40;
    const imgSize = 80;
    const gap = 20; // Increased gap to allow space for captions
    const maxPageY = 270; 
    
    data.photos.forEach((photoEntry, index) => {
       // Normalize data structure in case old data exists
       const photo: ReportPhoto = typeof photoEntry === 'string' 
          ? { uri: photoEntry, caption: '' } 
          : photoEntry;

       const isRightColumn = index % 2 !== 0;
       const x = isRightColumn ? margin + imgSize + gap : margin;
       
       // Calculate needed height for this item (Image + Caption)
       // We approximate caption height
       let captionLines: string[] = [];
       if (photo.caption) {
           doc.setFontSize(8);
           captionLines = doc.splitTextToSize(photo.caption, imgSize);
       }
       const itemTotalHeight = imgSize + (captionLines.length * 4) + 5;

       // Check page break based on total item height
       if (imgY + itemTotalHeight > maxPageY) {
         doc.addPage();
         imgY = 20;
       }

       // Draw Image container (border)
       setDraw(colors.light);
       doc.setLineWidth(0.5);
       doc.rect(x - 1, imgY - 1, imgSize + 2, imgSize + 2);
       
       try {
         doc.addImage(photo.uri, 'JPEG', x, imgY, imgSize, imgSize, undefined, 'FAST');
       } catch (e) {
         console.error("Image error", e);
         // Fallback box
         setFill(colors.light);
         doc.rect(x, imgY, imgSize, imgSize, 'F');
         setText(colors.label);
         doc.text("Erro na Imagem", x + 20, imgY + 40);
       }

       // Draw Caption
       if (photo.caption && captionLines.length > 0) {
           setText(colors.text);
           doc.setFont("helvetica", "normal");
           doc.setFontSize(8);
           doc.text(captionLines, x, imgY + imgSize + 5);
       }

       // Move Y down only after completing a row
       if (isRightColumn) {
         // Determine the height of the row based on the tallest item in this row? 
         // For simplicity, we assume max 2 lines of caption roughly or use fixed spacing
         // A safe increment is image size + some buffer for text
         imgY += imgSize + gap + 10; 
       }
    });
  }

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setText(colors.label);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, 290, { align: 'right' });
    doc.text("Relatório Gerado via Apprelatoriofacil criado por rafael", margin, 290);
  }

  // Sanitize description for filename
  const sanitizedDesc = template.omDescription
    .replace(/[^a-z0-9]/gi, '_') 
    .replace(/_+/g, '_') 
    .substring(0, 50); 
  
  const safeName = `Relatorio_OM_${data.omNumber || 'NaoIdentificada'}_${sanitizedDesc}.pdf`;
  
  // Generate PDF Blob
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], safeName, { type: "application/pdf" });

  // Prioritize Native Mobile Sharing
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Relatório OM ${data.omNumber}`,
        text: `Relatório de Execução - OM ${data.omNumber} - ${template.omDescription}`
      });
      // Share successful
    } catch (e) {
      // AbortError is typical for user cancellation, otherwise log
      if ((e as Error).name !== 'AbortError') {
         console.error("Share failed", e);
         // Fallback to direct download
         doc.save(safeName);
      }
    }
  } else {
    // Fallback for Desktop/Unsupported Browsers
    doc.save(safeName);
  }
};