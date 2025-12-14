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

function parseAISummary(aiSummary) {
  const sections = {
    keyTakeaway: [],
    problemAreas: [],
    successes: [],
    actions: []
  };

  const lines = aiSummary.split('\n').map(l => l.trim()).filter(Boolean);
  let current = null;

  for (const line of lines) {
    if (/^I\./i.test(line)) current = 'keyTakeaway';
    else if (/^II\./i.test(line)) current = 'problemAreas';
    else if (/^III\./i.test(line)) current = 'successes';
    else if (/^IV\./i.test(line)) current = 'actions';
    else if (current) sections[current].push(line.replace(/^[%•*-]\s*/, '').trim());
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
  chartList
}) {
  const analyticsSection = document.querySelector('[class*="analyticsSection"]');
  const toggleButton = analyticsSection?.querySelector('[class*="toggleButton"]');
  const analyticsContent = analyticsSection?.querySelector('[class*="analyticsContent"]');

  let wasCollapsed = false;
  if (analyticsContent && analyticsContent.offsetParent === null) {
    wasCollapsed = true;
    if (toggleButton) toggleButton.click();
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  const chartContainers = document.querySelectorAll('.chart-for-pdf');
  const chartImages = [];

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

  if (wasCollapsed && toggleButton) {
    toggleButton.click();
  }

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
  // COVER PAGE - Modern, Bold, Professional
  // ============================================
  
  // Gradient-like effect with overlapping rectangles
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Accent geometric elements
  pdf.setFillColor(...colors.accent);
  pdf.circle(pageWidth * 0.85, 40, 60, 'F');
  
  pdf.setFillColor(...colors.primaryLight);
  pdf.circle(-20, pageHeight * 0.75, 80, 'F');
  
  // Diagonal accent stripe
  pdf.setFillColor(37, 99, 235, 0.3);
  pdf.triangle(
    pageWidth, 0,
    pageWidth, 50,
    pageWidth - 60, 0,
    'F'
  );

  // Main title
  pdf.setTextColor(...colors.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(42);
  pdf.text('HOSPITAL', pageWidth / 2, 85, { align: 'center' });
  pdf.setFontSize(38);
  pdf.text('FEEDBACK REPORT', pageWidth / 2, 100, { align: 'center' });

  // Accent line
  pdf.setDrawColor(...colors.accent);
  pdf.setLineWidth(1.5);
  pdf.line(pageWidth / 2 - 40, 108, pageWidth / 2 + 40, 108);

  // Subtitle
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...colors.accentLight);
  pdf.text('Executive Summary & Analytics', pageWidth / 2, 120, { align: 'center' });

  // Stats cards at bottom
  const cardY = 160;
  const cardWidth = (pageWidth - 30) / 3;
  const cardX = [15, 15 + cardWidth, 15 + cardWidth * 2];

  const total = filteredData.length || 1;
  const posCount = filteredData.filter(f => f.sentiment === 'positive').length;
  const neuCount = filteredData.filter(f => f.sentiment === 'neutral').length;
  const negCount = filteredData.filter(f => f.sentiment === 'negative').length;

  // Card backgrounds
  pdf.setFillColor(255, 255, 255, 0.1);
  cardX.forEach(x => {
    pdf.roundedRect(x, cardY, cardWidth - 5, 35, 3, 3, 'F');
  });

  // Card 1 - Total Feedback
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.white);
  pdf.text(String(filteredData.length), cardX[0] + cardWidth / 2 - 2.5, cardY + 18, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Total Feedback', cardX[0] + cardWidth / 2 - 2.5, cardY + 27, { align: 'center' });

  // Card 2 - Positive %
  const posPercent = Math.round((posCount / total) * 100);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.accentLight);
  pdf.text(`${posPercent}%`, cardX[1] + cardWidth / 2 - 2.5, cardY + 18, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...colors.white);
  pdf.text('Positive', cardX[1] + cardWidth / 2 - 2.5, cardY + 27, { align: 'center' });

  // Card 3 - Period
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...colors.white);
  const period = filterSummary.dateRange || 'All Time';
  pdf.text(period, cardX[2] + cardWidth / 2 - 2.5, cardY + 15, { align: 'center', maxWidth: cardWidth - 10 });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Report Period', cardX[2] + cardWidth / 2 - 2.5, cardY + 27, { align: 'center' });

  // Footer info
  pdf.setFontSize(9);
  pdf.setTextColor(200, 200, 200);
  pdf.text(`Generated on ${format(new Date(), 'MMMM d, yyyy')} at ${format(new Date(), 'h:mm a')}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

  // ============================================
  // SENTIMENT OVERVIEW PAGE
  // ============================================
  pdf.addPage();
  yPos = 0;

  // Header with gradient effect
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageWidth, 45, 'F');
  
  pdf.setFillColor(...colors.accent);
  pdf.circle(pageWidth - 15, 22, 35, 'F');

  pdf.setTextColor(...colors.white);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.text('Sentiment Overview', 15, 28);

  yPos = 55;

  // Large sentiment visualization
  pdf.setFillColor(...colors.lightGray);
  pdf.roundedRect(15, yPos, pageWidth - 30, 55, 4, 4, 'F');

  // Sentiment bars
  const barY = yPos + 12;
  const barHeight = 18;
  const barWidth = pageWidth - 50;
  const barX = 25;

  // Positive bar
  pdf.setFillColor(...colors.success);
  const posWidth = barWidth * (posCount / total);
  pdf.roundedRect(barX, barY, posWidth, barHeight, 2, 2, 'F');
  
  // Neutral bar
  pdf.setFillColor(...colors.warning);
  const neuWidth = barWidth * (neuCount / total);
  pdf.rect(barX + posWidth, barY, neuWidth, barHeight, 'F');
  
  // Negative bar
  pdf.setFillColor(...colors.danger);
  const negWidth = barWidth * (negCount / total);
  pdf.roundedRect(barX + posWidth + neuWidth, barY, negWidth, barHeight, 2, 2, 'F');

  // Legend with percentages
  yPos = barY + barHeight + 12;
  const legendX = [barX, barX + barWidth / 3, barX + (barWidth * 2) / 3];

  // Positive
  pdf.setFillColor(...colors.success);
  pdf.circle(legendX[0] + 3, yPos - 2, 3, 'F');
  pdf.setTextColor(...colors.dark);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(`${posPercent}% Positive`, legendX[0] + 10, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`(${posCount} responses)`, legendX[0] + 10, yPos + 6);

  // Neutral
  const neuPercent = Math.round((neuCount / total) * 100);
  pdf.setFillColor(...colors.warning);
  pdf.circle(legendX[1] + 3, yPos - 2, 3, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(`${neuPercent}% Neutral`, legendX[1] + 10, yPos);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`(${neuCount} responses)`, legendX[1] + 10, yPos + 6);

  // Negative
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

  // Report details in boxes with light gray background
  const detailBoxes = [
    { label: 'Source', value: filterSummary.source || 'Mixed Sources' },
    { label: 'Department', value: filterSummary.department || 'All Departments' },
    { label: 'Date Range', value: filterSummary.dateRange || 'All Time' }
  ];

  const boxHeight = 20;
  const boxSpacing = 6;
  const totalBoxHeight = detailBoxes.length * boxHeight + (detailBoxes.length - 1) * boxSpacing;
  const startY = (pageHeight - totalBoxHeight) / 2 + 20; // Center vertically with offset

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
  // EXECUTIVE SUMMARY PAGES
  // ============================================
  const sections = parseAISummary(aiSummary);
  const sectionData = [
    { title: 'KEY TAKEAWAY', subtitle: 'Overall Situation Assessment', lines: sections.keyTakeaway, icon: 'circle' },
    { title: 'PROBLEM AREAS', subtitle: 'Critical Issues Identified', lines: sections.problemAreas, icon: 'triangle' },
    { title: 'POSITIVE HIGHLIGHTS', subtitle: 'Successes & Strengths', lines: sections.successes, icon: 'star' },
    { title: 'RECOMMENDED ACTIONS', subtitle: 'Next Steps', lines: sections.actions, icon: 'arrow' }
  ];

  for (const sec of sectionData) {
    if (sec.lines.length === 0) continue;

    pdf.addPage();
    yPos = 0;

    // Section header
    pdf.setFillColor(...colors.primary);
    pdf.rect(0, 0, pageWidth, 50, 'F');
    
    // Accent element
    pdf.setFillColor(...colors.accent);
    pdf.circle(pageWidth - 10, 25, 40, 'F');

    pdf.setTextColor(...colors.white);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.text(sec.title, 15, 23);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor(...colors.accentLight);
    pdf.text(sec.subtitle, 15, 35);

    yPos = 65;
    pdf.setTextColor(...colors.dark);

    // Content
    sec.lines.forEach((line, idx) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        yPos = 25;
        
        // Continuation header
        pdf.setFillColor(...colors.lightGray);
        pdf.rect(0, 0, pageWidth, 15, 'F');
        pdf.setTextColor(...colors.primary);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(`${sec.title} (continued)`, 15, 10);
        pdf.setTextColor(...colors.dark);
      }

      // Bullet point with icon
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...colors.primaryLight);
      
      // Draw icon based on type
      if (sec.icon === 'circle') {
        pdf.setFillColor(...colors.primaryLight);
        pdf.circle(22, yPos - 2, 2, 'F');
      } else if (sec.icon === 'triangle') {
        pdf.setFillColor(...colors.danger);
        pdf.triangle(20, yPos - 1, 24, yPos - 1, 22, yPos - 5, 'F');
      } else if (sec.icon === 'star') {
        pdf.setFillColor(...colors.success);
        pdf.circle(22, yPos - 2, 2, 'F');
      } else if (sec.icon === 'arrow') {
        pdf.setFillColor(...colors.accent);
        pdf.triangle(20, yPos - 3, 20, yPos + 1, 24, yPos - 1, 'F');
      }

      // Content
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(...colors.dark);
      yPos = addWrappedText(pdf, line, 30, yPos, pageWidth - 45, 5.5);
      yPos += 8;
    });
  }

  // ============================================
  // CHARTS SECTION - ONE PER PAGE
  // ============================================
  for (let i = 0; i < chartImages.length; i++) {
    const chart = chartImages[i];
    const isPie = isPieChart(chart.aspectRatio);
    const isLandscape = !isPie;

    if (isLandscape) {
      // Create landscape page for bar/line charts
      pdf.addPage('a4', 'landscape');
      const landscapeWidth = pdf.internal.pageSize.getWidth();
      const landscapeHeight = pdf.internal.pageSize.getHeight();

      // Header
      pdf.setFillColor(...colors.primary);
      pdf.rect(0, 0, landscapeWidth, 35, 'F');
      
      pdf.setFillColor(...colors.accent);
      pdf.circle(landscapeWidth - 10, 17.5, 25, 'F');

      pdf.setTextColor(...colors.white);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text(`Chart ${i + 1}`, 15, 15);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      pdf.text(chart.title, 15, 25);

      // Chart image - maximize size and center
      yPos = 45;
      const maxChartWidth = landscapeWidth - 30;
      const maxChartHeight = landscapeHeight - yPos - 40;
      
      let imgW = maxChartWidth;
      let imgH = imgW * chart.aspectRatio;
      
      if (imgH > maxChartHeight) {
        imgH = maxChartHeight;
        imgW = imgH / chart.aspectRatio;
      }

      const imgX = (landscapeWidth - imgW) / 2;
      const imgY = yPos + (maxChartHeight - imgH) / 2;
      pdf.addImage(chart.data, 'PNG', imgX, imgY, imgW, imgH);

      // Description at bottom
      if (chart.description) {
        const descY = landscapeHeight - 25;
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.gray);
        pdf.setFont('helvetica', 'italic');
        addWrappedText(pdf, chart.description, 15, descY, landscapeWidth - 30, 5);
      }
    } else {
      // Portrait page for pie/donut charts
      pdf.addPage('a4', 'portrait');

      // Header
      pdf.setFillColor(...colors.primary);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setFillColor(...colors.accent);
      pdf.circle(pageWidth - 10, 20, 30, 'F');

      pdf.setTextColor(...colors.white);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.text(`Chart ${i + 1}`, 15, 18);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(14);
      pdf.text(chart.title, 15, 30);

      // Chart image - centered both horizontally and vertically
      yPos = 55;
      const maxWidth = pageWidth - 40;
      const maxHeight = pageHeight - yPos - 80; // Leave space for description
      
      let imgW = maxWidth;
      let imgH = imgW * chart.aspectRatio;
      
      if (imgH > maxHeight) {
        imgH = maxHeight;
        imgW = imgH / chart.aspectRatio;
      }

      const imgX = (pageWidth - imgW) / 2;
      const imgY = yPos + (maxHeight - imgH) / 2;
      pdf.addImage(chart.data, 'PNG', imgX, imgY, imgW, imgH);

      // Description at bottom
      if (chart.description) {
        const descY = pageHeight - 35;
        pdf.setFontSize(11);
        pdf.setTextColor(...colors.gray);
        pdf.setFont('helvetica', 'italic');
        addWrappedText(pdf, chart.description, 20, descY, pageWidth - 40, 5.5);
      }
    }
  }

  // ============================================
  // FOOTER ON ALL PAGES
  // ============================================
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    
    if (p > 1) {
      const currentHeight = pdf.internal.pageSize.getHeight();
      
      // Footer separator line
      pdf.setDrawColor(...colors.lightGray);
      pdf.setLineWidth(0.3);
      pdf.line(15, currentHeight - 18, pdf.internal.pageSize.getWidth() - 15, currentHeight - 18);

      // Page number
      pdf.setFontSize(9);
      pdf.setTextColor(...colors.gray);
      pdf.setFont('helvetica', 'normal');
      pdf.text(
        `Page ${p} of ${totalPages}`,
        pdf.internal.pageSize.getWidth() / 2,
        currentHeight - 10,
        { align: 'center' }
      );

      // Date
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