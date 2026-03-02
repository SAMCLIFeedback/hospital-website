// src/utils/generatePDFReport.js
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';

async function captureChartDirect(chartContainer, chartTitle) {
  try {
    const canvas = chartContainer.querySelector('canvas');
    if (!canvas) return null;

    const width = canvas.width;
    const height = canvas.height;
    const aspectRatio = height / width;

    const imageData = canvas.toDataURL('image/png', 1.0);

    return {
      data: imageData,
      aspectRatio,
      originalWidth: width,
      originalHeight: height
    };
  } catch (error) {
    return null;
  }
}

function isPieChart(aspectRatio) {
  return aspectRatio > 0.7 && aspectRatio < 1.3;
}

/**
 * Enhanced parser that preserves hierarchical structure from AI summary
 */
function parseAISummaryEnhanced(aiSummary) {
  const sections = {
    executiveOverview: { title: 'EXECUTIVE OVERVIEW', content: [] },
    problemAreas: { title: 'CRITICAL PROBLEM AREAS', content: [] },
    opportunities: { title: 'OPERATIONAL EXCELLENCE OPPORTUNITIES', content: [] },
    strengths: { title: 'STRENGTHS AND POSITIVE PERFORMANCE', content: [] },
    recommendations: { title: 'STRATEGIC RECOMMENDATIONS', content: [] }
  };

  const lines = aiSummary.split('\n').map(l => l.trim()).filter(Boolean);
  let currentSection = null;
  let currentItem = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Section headers (I., II., III., IV., V.)
    if (/^I\.\s*EXECUTIVE OVERVIEW/i.test(line)) {
      currentSection = 'executiveOverview';
      currentItem = null;
      continue;
    } else if (/^II\.\s*CRITICAL PROBLEM AREAS/i.test(line)) {
      currentSection = 'problemAreas';
      currentItem = null;
      continue;
    } else if (/^III\.\s*OPERATIONAL EXCELLENCE/i.test(line)) {
      currentSection = 'opportunities';
      currentItem = null;
      continue;
    } else if (/^IV\.\s*STRENGTHS/i.test(line)) {
      currentSection = 'strengths';
      currentItem = null;
      continue;
    } else if (/^V\.\s*STRATEGIC RECOMMENDATIONS/i.test(line)) {
      currentSection = 'recommendations';
      currentItem = null;
      continue;
    }

    if (!currentSection) continue;

    // Main bullet items (• at start)
    if (line.startsWith('•')) {
      const itemTitle = line.replace(/^•\s*/, '').trim();
      currentItem = {
        title: itemTitle,
        subsections: []
      };
      sections[currentSection].content.push(currentItem);
      continue;
    }

    // Sub-sections (Overview:, Impact & Frequency:, etc.)
    const subSectionMatch = line.match(/^(Overview|Impact & Frequency|Patient\/Staff Voice|Root Cause Indicators|Data Support|Current State|Stakeholder Impact|Improvement Potential|Evidence|Performance Summary|Stakeholder Feedback|Success Factors|Replication Opportunity|Action Required|Responsible Party|Expected Outcomes|Evidence Base|Timeline|Resource Implications):\s*(.+)/i);
    
    if (subSectionMatch && currentItem) {
      const [, label, content] = subSectionMatch;
      currentItem.subsections.push({
        label: label.trim(),
        content: content.trim()
      });
      continue;
    }

    // Regular paragraph content
    if (currentSection === 'executiveOverview') {
      // Executive overview is just paragraphs
      sections[currentSection].content.push({
        type: 'paragraph',
        text: line
      });
    } else if (currentItem && currentItem.subsections.length > 0) {
      // Continue previous subsection
      const lastSubsection = currentItem.subsections[currentItem.subsections.length - 1];
      lastSubsection.content += ' ' + line;
    } else if (currentItem) {
      // Content before any subsection label
      if (!currentItem.description) {
        currentItem.description = line;
      } else {
        currentItem.description += ' ' + line;
      }
    }
  }

  return sections;
}

function addWrappedText(pdf, text, x, y, maxWidth, lineHeight = 5.5) {
  const lines = pdf.splitTextToSize(text, maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export async function generatePDFReport({
  filteredData,
  aiSummary,
  filterSummary,
  chartList,
  chartInterpretations = []
}) {
  // CRITICAL: Look for charts in the REPORT MODAL
  const reportModal = document.querySelector('[class*="reportModal"]');
  let chartContainers;
  
  if (reportModal) {
    chartContainers = reportModal.querySelectorAll('.report-chart-container.chart-for-pdf');
    console.log(`Found ${chartContainers.length} charts in report modal`);
  } else {
    console.warn('Report modal not found, falling back to dashboard charts');
    chartContainers = document.querySelectorAll('.chart-for-pdf');
  }

  const chartImages = [];

  // Capture charts
  for (let i = 0; i < Math.min(chartList.length, chartContainers.length); i++) {
    const imageInfo = await captureChartDirect(chartContainers[i], chartList[i].title);
    if (imageInfo) {
      chartImages.push({
        title: chartList[i].title,
        description: chartList[i].description || '',
        ...imageInfo
      });
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Captured ${chartImages.length} chart images for PDF`);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPos = 0;

  const colors = {
    primary: [16, 45, 120],
    primaryLight: [37, 99, 235],
    accent: [6, 182, 212],
    accentLight: [103, 232, 249],
    success: [5, 150, 105],
    warning: [245, 158, 11],
    danger: [220, 38, 38],
    dark: [15, 23, 42],
    gray: [71, 85, 105],
    lightGray: [241, 245, 249],
    white: [255, 255, 255]
  };

  // ============================================
  // COVER PAGE
  // ============================================
  
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  pdf.setFillColor(...colors.accent);
  pdf.circle(pageWidth * 0.85, 40, 60, 'F');
  
  pdf.setFillColor(...colors.primaryLight);
  pdf.circle(-20, pageHeight * 0.75, 80, 'F');
  
  pdf.setFillColor(37, 99, 235, 0.3);
  pdf.triangle(
    pageWidth, 0,
    pageWidth, 50,
    pageWidth - 60, 0,
    'F'
  );

  pdf.setTextColor(...colors.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(42);
  pdf.text('HOSPITAL', pageWidth / 2, 85, { align: 'center' });
  pdf.setFontSize(38);
  pdf.text('FEEDBACK REPORT', pageWidth / 2, 100, { align: 'center' });

  pdf.setDrawColor(...colors.accent);
  pdf.setLineWidth(1.5);
  pdf.line(pageWidth / 2 - 40, 108, pageWidth / 2 + 40, 108);

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...colors.accentLight);
  pdf.text('Executive Summary & Analytics', pageWidth / 2, 120, { align: 'center' });

  const cardY = 160;
  const cardWidth = (pageWidth - 30) / 3;
  const cardX = [15, 15 + cardWidth, 15 + cardWidth * 2];

  const total = filteredData.length || 1;
  const posCount = filteredData.filter(f => f.sentiment === 'positive').length;
  const neuCount = filteredData.filter(f => f.sentiment === 'neutral').length;
  const negCount = filteredData.filter(f => f.sentiment === 'negative').length;

  pdf.setFillColor(255, 255, 255, 0.1);
  cardX.forEach(x => {
    pdf.roundedRect(x, cardY, cardWidth - 5, 35, 3, 3, 'F');
  });

  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.white);
  pdf.text(String(filteredData.length), cardX[0] + cardWidth / 2 - 2.5, cardY + 18, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Total Feedback', cardX[0] + cardWidth / 2 - 2.5, cardY + 27, { align: 'center' });

  const posPercent = Math.round((posCount / total) * 100);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.accentLight);
  pdf.text(`${posPercent}%`, cardX[1] + cardWidth / 2 - 2.5, cardY + 18, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...colors.white);
  pdf.text('Positive', cardX[1] + cardWidth / 2 - 2.5, cardY + 27, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.white);
  const period = filterSummary.dateRange || 'All Time';
  pdf.text(period, cardX[2] + cardWidth / 2 - 2.5, cardY + 15, { align: 'center', maxWidth: cardWidth - 10 });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Report Period', cardX[2] + cardWidth / 2 - 2.5, cardY + 27, { align: 'center' });

  pdf.setFontSize(9);
  pdf.setTextColor(200, 200, 200);
  pdf.text(`Generated on ${format(new Date(), 'MMMM d, yyyy')} at ${format(new Date(), 'h:mm a')}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

  // ============================================
  // SENTIMENT OVERVIEW PAGE
  // ============================================
  pdf.addPage();
  yPos = 0;

  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 45, 'F');
  
  pdf.setFillColor(...colors.accent);
  pdf.circle(pageWidth - 15, 22, 35, 'F');

  pdf.setTextColor(...colors.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.text('Sentiment Overview', 15, 28);

  yPos = 55;

  pdf.setFillColor(...colors.lightGray);
  pdf.roundedRect(15, yPos, pageWidth - 30, 55, 4, 4, 'F');

  const barY = yPos + 12;
  const barHeight = 18;
  const barWidth = pageWidth - 50;
  const barX = 25;

  pdf.setFillColor(...colors.success);
  const posWidth = barWidth * (posCount / total);
  pdf.roundedRect(barX, barY, posWidth, barHeight, 2, 2, 'F');
  
  pdf.setFillColor(...colors.warning);
  const neuWidth = barWidth * (neuCount / total);
  pdf.rect(barX + posWidth, barY, neuWidth, barHeight, 'F');
  
  pdf.setFillColor(...colors.danger);
  const negWidth = barWidth * (negCount / total);
  pdf.roundedRect(barX + posWidth + neuWidth, barY, negWidth, barHeight, 2, 2, 'F');

  yPos = barY + barHeight + 12;
  const legendX = [barX, barX + barWidth / 3, barX + (barWidth * 2) / 3];

  pdf.setFillColor(...colors.success);
  pdf.circle(legendX[0] + 3, yPos - 2, 3, 'F');
  pdf.setTextColor(...colors.dark);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(`${posPercent}% Positive`, legendX[0] + 10, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`(${posCount} responses)`, legendX[0] + 10, yPos + 6);

  const neuPercent = Math.round((neuCount / total) * 100);
  pdf.setFillColor(...colors.warning);
  pdf.circle(legendX[1] + 3, yPos - 2, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(`${neuPercent}% Neutral`, legendX[1] + 10, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`(${neuCount} responses)`, legendX[1] + 10, yPos + 6);

  const negPercent = Math.round((negCount / total) * 100);
  pdf.setFillColor(...colors.danger);
  pdf.circle(legendX[2] + 3, yPos - 2, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(`${negPercent}% Negative`, legendX[2] + 10, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`(${negCount} responses)`, legendX[2] + 10, yPos + 6);

  yPos = 125;

  const detailBoxes = [
    { label: 'Source', value: filterSummary.source || 'Mixed Sources' },
    { label: 'Department', value: filterSummary.department || 'All Departments' },
    { label: 'Date Range', value: filterSummary.dateRange || 'All Time' }
  ];

  const boxHeight = 20;
  const boxSpacing = 6;
  const totalBoxHeight = detailBoxes.length * boxHeight + (detailBoxes.length - 1) * boxSpacing;
  const startY = (pageHeight - totalBoxHeight) / 2 + 20;

  detailBoxes.forEach((box, idx) => {
    const boxY = startY + (idx * (boxHeight + boxSpacing));
    
    pdf.setFillColor(...colors.lightGray);
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(15, boxY, pageWidth - 30, boxHeight, 2, 2, 'FD');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.gray);
    pdf.text(box.label, 20, boxY + 8);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(...colors.dark);
    pdf.text(box.value, 20, boxY + 15);
  });

  // ============================================
  // EXECUTIVE SUMMARY PAGES - ENHANCED STYLING
  // ============================================
  const sections = parseAISummaryEnhanced(aiSummary);

  // Section I: Executive Overview (Paragraphs only)
  if (sections.executiveOverview.content.length > 0) {
    pdf.addPage();
    yPos = 0;

    // Header
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, 0, pageWidth, 50, 'F');
    pdf.setFillColor(...colors.accent);
    pdf.circle(pageWidth - 10, 25, 40, 'F');

    pdf.setTextColor(...colors.white);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.text('EXECUTIVE OVERVIEW', 15, 23);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(...colors.accentLight);
    pdf.text('Comprehensive Analysis & Key Findings', 15, 35);

    yPos = 65;
    pdf.setTextColor(...colors.dark);

    sections.executiveOverview.content.forEach(item => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = 20;
      }

      if (item.type === 'paragraph') {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        yPos = addWrappedText(pdf, item.text, 20, yPos, pageWidth - 40, 6);
        yPos += 8;
      }
    });
  }

  // Sections II-V: Structured items with subsections
  const structuredSections = [
    { key: 'problemAreas', color: colors.danger, icon: 'alert' },
    { key: 'opportunities', color: colors.warning, icon: 'lightbulb' },
    { key: 'strengths', color: colors.success, icon: 'star' },
    { key: 'recommendations', color: colors.accent, icon: 'check' }
  ];

  structuredSections.forEach(({ key, color, icon }) => {
    const section = sections[key];
    if (section.content.length === 0) return;

    pdf.addPage();
    yPos = 0;

    // Section Header
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, 0, pageWidth, 50, 'F');
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.circle(pageWidth - 10, 25, 40, 'F');

    pdf.setTextColor(...colors.white);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.text(section.title, 15, 28);

    yPos = 65;
    pdf.setTextColor(...colors.dark);

    section.content.forEach((item, itemIdx) => {
      // Check if we need a new page
      if (yPos > pageHeight - 60) {
        pdf.addPage();
        yPos = 25;
        
        // Continuation header
        pdf.setFillColor(...colors.lightGray);
        pdf.rect(0, 0, pageWidth, 15, 'F');
        pdf.setTextColor(...colors.primary);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(`${section.title} (continued)`, 15, 10);
        pdf.setTextColor(...colors.dark);
      }

      // Item Title (bold, larger, with icon/number)
      pdf.setFillColor(color[0], color[1], color[2]);
      pdf.circle(18, yPos - 2, 2.5, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(color[0], color[1], color[2]);
      yPos = addWrappedText(pdf, item.title, 25, yPos, pageWidth - 35, 6);
      yPos += 6;

      pdf.setTextColor(...colors.dark);

      // Item description (if exists, before subsections)
      if (item.description) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        yPos = addWrappedText(pdf, item.description, 25, yPos, pageWidth - 35, 5.5);
        yPos += 4;
      }

      // Subsections
      item.subsections?.forEach(sub => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = 25;
          
          pdf.setFillColor(...colors.lightGray);
          pdf.rect(0, 0, pageWidth, 15, 'F');
          pdf.setTextColor(...colors.primary);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text(`${section.title} (continued)`, 15, 10);
          pdf.setTextColor(...colors.dark);
        }

        // Subsection label (bold, indented)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.gray);
        pdf.text(`${sub.label}:`, 30, yPos);
        yPos += 5;

        // Subsection content (normal, indented more)
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.dark);
        yPos = addWrappedText(pdf, sub.content, 30, yPos, pageWidth - 45, 5.5);
        yPos += 6;
      });

      // Spacing between items
      yPos += 6;
    });
  });

  // ============================================
  // CHARTS SECTION
  // ============================================
  for (let i = 0; i < chartImages.length; i++) {
    const chart = chartImages[i];
    // Safely grab the interpretation or fallback
    const interpretationText = chartInterpretations[i] || "No interpretation generated.";
    
    // Always add a new portrait page for each chart
    pdf.addPage('a4', 'portrait');
    let yPos = 0; // Ensure yPos resets properly

    // Header for the page
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setFillColor(...colors.accent);
    pdf.circle(pageWidth - 10, 20, 30, 'F');

    pdf.setTextColor(...colors.white);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text(`Figure ${i + 1}`, 15, 18);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);
    pdf.text(chart.title, 15, 30);

    // --- DRAW THE CHART SCREENSHOT ---
    yPos = 50; 
    const maxWidth = pageWidth - 30;
    const maxHeight = 130; // Restrict height so text fits below
    
    let imgW = maxWidth;
    let imgH = imgW * chart.aspectRatio;
    
    if (imgH > maxHeight) {
      imgH = maxHeight;
      imgW = imgH / chart.aspectRatio;
    }

    const imgX = (pageWidth - imgW) / 2;
    pdf.addImage(chart.data, 'PNG', imgX, yPos, imgW, imgH);

    // --- DRAW THE AI INTERPRETATION ---
    yPos = yPos + imgH + 20;

    // Sub-header for interpretation
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...colors.primary);
    pdf.text("AI Interpretation", 15, yPos);
    yPos += 8;

    // The AI generated text
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...colors.dark);
    
    // addWrappedText handles line breaks
    addWrappedText(pdf, interpretationText, 15, yPos, pageWidth - 30, 6);
  }

  // ============================================
  // FOOTER ON ALL PAGES
  // ============================================
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    
    if (p > 1) {
      const currentHeight = pdf.internal.pageSize.getHeight();
      
      pdf.setDrawColor(...colors.lightGray);
      pdf.setLineWidth(0.3);
      pdf.line(15, currentHeight - 18, pdf.internal.pageSize.getWidth() - 15, currentHeight - 18);

      pdf.setFontSize(9);
      pdf.setTextColor(...colors.gray);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Page ${p} of ${totalPages}`,
        pdf.internal.pageSize.getWidth() / 2,
        currentHeight - 10,
        { align: 'center' }
      );

      pdf.text(
        format(new Date(), 'MMM d, yyyy'),
        pdf.internal.pageSize.getWidth() - 15,
        currentHeight - 10,
        { align: 'right' }
      );
    }
  }

  const filename = `Hospital_Feedback_Report_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;
  pdf.save(filename);
}