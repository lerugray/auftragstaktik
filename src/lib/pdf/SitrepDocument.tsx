import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { BriefingResponse } from '@/lib/types/events';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Courier',
    backgroundColor: '#ffffff',
    color: '#1a1a2e',
  },
  classificationBanner: {
    backgroundColor: '#006622',
    color: '#ffffff',
    textAlign: 'center',
    padding: 4,
    fontSize: 8,
    letterSpacing: 3,
    marginBottom: 16,
  },
  header: {
    borderBottom: '2px solid #1a1a2e',
    paddingBottom: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dtg: {
    fontSize: 9,
    color: '#555570',
  },
  meta: {
    fontSize: 8,
    color: '#555570',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#996600',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 1,
  },
  sectionBody: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  noActivity: {
    fontSize: 10,
    color: '#888888',
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: '1px solid #cccccc',
    paddingTop: 6,
    fontSize: 7,
    color: '#888888',
  },
  footerBanner: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    backgroundColor: '#006622',
    color: '#ffffff',
    textAlign: 'center',
    padding: 3,
    fontSize: 7,
    letterSpacing: 3,
  },
});

const SECTIONS: { key: keyof BriefingResponse['sections']; label: string }[] = [
  { key: 'situation', label: 'SITUATION' },
  { key: 'enemyActivity', label: 'ENEMY ACTIVITY' },
  { key: 'friendlyActivity', label: 'FRIENDLY ACTIVITY' },
  { key: 'airActivity', label: 'AIR ACTIVITY' },
  { key: 'maritimeActivity', label: 'MARITIME ACTIVITY' },
  { key: 'assessment', label: 'ASSESSMENT' },
  { key: 'outlook', label: 'OUTLOOK' },
];

interface SitrepDocumentProps {
  briefing: BriefingResponse;
}

export function SitrepDocument({ briefing }: SitrepDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Classification banner */}
        <View style={styles.classificationBanner}>
          <Text>{briefing.classification}</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{briefing.title}</Text>
          <Text style={styles.dtg}>DTG: {briefing.dtg}</Text>
          <Text style={styles.meta}>Sources: {briefing.sourceCount} | Provider: {briefing.provider}</Text>
        </View>

        {/* Sections */}
        {SECTIONS.map(({ key, label }) => {
          const content = briefing.sections[key];
          return (
            <View key={key}>
              <Text style={styles.sectionHeader}>{label}:</Text>
              {content && content !== 'No significant activity reported.' ? (
                <Text style={styles.sectionBody}>{content}</Text>
              ) : (
                <Text style={styles.noActivity}>No significant activity reported.</Text>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated {briefing.generatedAt?.substring(0, 16)} UTC via {briefing.provider} | Auftragstaktik OSINT Terminal</Text>
        </View>

        {/* Bottom classification banner */}
        <View style={styles.footerBanner}>
          <Text>{briefing.classification}</Text>
        </View>
      </Page>
    </Document>
  );
}
