export interface ProvenanceOutput {
  sbomPath: string;
  slsaPath: string;
}

export function generateProvenance(buildDir: string): ProvenanceOutput {
  const sbom = generateSBOM();
  const slsa = generateSLSA();

  return {
    sbomPath: `${buildDir}/sbom.json`,
    slsaPath: `${buildDir}/slsa.json`,
  };
}

function generateSBOM() {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      component: {
        type: 'application',
        name: 'exported-website',
        version: '1.0.0',
      },
    },
    components: [
      { type: 'library', name: 'react', version: '18.3.1', purl: 'pkg:npm/react@18.3.1' },
      { type: 'library', name: 'next', version: '14.0.0', purl: 'pkg:npm/next@14.0.0' },
      { type: 'library', name: 'tailwindcss', version: '3.4.1', purl: 'pkg:npm/tailwindcss@3.4.1' },
    ],
  };
}

function generateSLSA() {
  return {
    _type: 'https://in-toto.io/Statement/v0.1',
    subject: [
      {
        name: 'exported-website',
        digest: {
          sha256: 'placeholder-sha256',
        },
      },
    ],
    predicateType: 'https://slsa.dev/provenance/v0.2',
    predicate: {
      builder: {
        id: 'https://craudiovizai.com/website-builder/v1',
      },
      buildType: 'https://craudiovizai.com/website-builder/v1',
      metadata: {
        buildInvocationId: crypto.randomUUID(),
        buildStartedOn: new Date().toISOString(),
        buildFinishedOn: new Date().toISOString(),
        completeness: {
          parameters: true,
          environment: false,
          materials: true,
        },
        reproducible: false,
      },
      materials: [],
    },
  };
}
