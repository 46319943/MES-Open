import type { Data } from '@/shared/models/data.model';
import type { OutputFormat } from '@/shared/models/output-format.model';
import { parseCoTToSegments } from './cot-parser';
import { generateCoTString } from './cot-generator';

// Demo data object
const demoData: Data = {
  id: 'demo-001',
  text: 'The aroma of freshly baked bread filled the kitchen. I could hear the sizzling of bacon in the pan.',
  segments: [
    {
      indexStart: 0,
      indexEnd: 47, // "The aroma of freshly baked bread filled the kitchen."
      annotations: [
        {
          sense: 'Smell',
          stimulus: 'freshly baked bread',
          perception: 'warm, yeasty scent',
          sentiment: 'Positive',
          CoT: 'The smell of bread baking creates a comforting, homey atmosphere',
        },
      ],
    },
    {
      indexStart: 48,
      indexEnd: 94, // "I could hear the sizzling of bacon in the pan."
      annotations: [
        {
          sense: 'Hearing',
          stimulus: 'sizzling of bacon',
          perception: 'crackling sound',
          sentiment: 'Positive',
          CoT: 'The sizzling sound indicates the bacon is cooking properly and will be crispy',
        },
      ],
    },
  ],
  metaData: {
    source: 'demo',
    category: 'kitchen-scene',
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Demo output format object
const demoOutputFormat: OutputFormat = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  name: 'Sensory Analysis Format',
  // Key names for the output
  senseName: 'sensory_type',
  stimulusName: 'trigger',
  perceptionName: 'experience',
  sentimentName: 'emotional_tone',
  // Sense value names for the output
  visionName: 'Visual',
  hearingName: 'Auditory',
  tasteName: 'Gustatory',
  smellName: 'Olfactory',
  touchName: 'Tactile',
  // Sentiment value names for the output
  positiveName: 'Pleasant',
  negativeName: 'Unpleasant',
  neutralName: 'Neutral',
  // CoT templates for the output
  CoTStartTemplate: 'Let me analyze the sensory experiences in this text:',
  CoTSentenceExistTemplate: 'Analyzing sentence: "{{ SENTENCE }}"',
  CoTSentenceNotExistTemplate: 'No sensory content in: "{{ SENTENCE }}"',
  CoTSentenceAnnotationTemplate: 'Found annotation: {{ ANNOTATION }} - Reasoning: {{ COT }}',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Generate sample CoT output string
const sampleCoTString = generateCoTString(demoData, demoOutputFormat);

console.log('=== DEMO: CoT Parser Implementation ===\n');

console.log('1. Original Data Object:');
console.log(JSON.stringify(demoData, null, 2));
console.log('\n');

console.log('2. Output Format Configuration:');
console.log(JSON.stringify(demoOutputFormat, null, 2));
console.log('\n');

console.log('3. Generated CoT String:');
console.log('---');
console.log(sampleCoTString);
console.log('---\n');

console.log('4. Testing Parser Function:');
console.log('Parsing the CoT string back to segments...\n');

// Test the parser function
const parsedSegments = parseCoTToSegments(sampleCoTString, demoOutputFormat, demoData.text);

console.log('5. Parsed Segments:');
console.log(JSON.stringify(parsedSegments, null, 2));
console.log('\n');

// Verify the parser worked correctly
console.log('6. Verification:');
console.log('Original segments count:', demoData.segments.length);
console.log('Parsed segments count:', parsedSegments.length);

let allMatch = true;
demoData.segments.forEach((originalSegment, index) => {
  const parsedSegment = parsedSegments[index];
  if (!parsedSegment) {
    console.log(`❌ Missing segment at index ${index}`);
    allMatch = false;
    return;
  }

  console.log(`\nSegment ${index}:`);
  console.log(
    `  Text range: ${originalSegment.indexStart}-${originalSegment.indexEnd} vs ${parsedSegment.indexStart}-${parsedSegment.indexEnd}`,
  );
  console.log(
    `  Text: "${demoData.text.substring(originalSegment.indexStart, originalSegment.indexEnd)}"`,
  );

  if (
    originalSegment.indexStart !== parsedSegment.indexStart ||
    originalSegment.indexEnd !== parsedSegment.indexEnd
  ) {
    console.log(`  ⚠️  Index mismatch`);
  } else {
    console.log(`  ✅ Indices match`);
  }

  console.log(
    `  Annotations: ${originalSegment.annotations.length} vs ${parsedSegment.annotations.length}`,
  );

  if (originalSegment.annotations.length !== parsedSegment.annotations.length) {
    console.log(`  ❌ Annotation count mismatch`);
    allMatch = false;
  } else {
    originalSegment.annotations.forEach((originalAnnotation, annotationIndex) => {
      const parsedAnnotation = parsedSegment.annotations[annotationIndex];
      if (!parsedAnnotation) {
        console.log(`    ❌ Missing annotation ${annotationIndex}`);
        allMatch = false;
        return;
      }

      const matches =
        originalAnnotation.sense === parsedAnnotation.sense &&
        originalAnnotation.stimulus === parsedAnnotation.stimulus &&
        originalAnnotation.perception === parsedAnnotation.perception &&
        originalAnnotation.sentiment === parsedAnnotation.sentiment &&
        originalAnnotation.CoT === parsedAnnotation.CoT;

      if (matches) {
        console.log(`    ✅ Annotation ${annotationIndex} matches`);
      } else {
        console.log(`    ❌ Annotation ${annotationIndex} mismatch:`);
        console.log(`      Original:`, originalAnnotation);
        console.log(`      Parsed:`, parsedAnnotation);
        allMatch = false;
      }
    });
  }
});

console.log('\n7. Final Result:');
if (allMatch) {
  console.log('🎉 SUCCESS: Parser correctly converted CoT string back to original segments!');
} else {
  console.log('❌ FAILURE: Parser did not correctly convert CoT string');
}
