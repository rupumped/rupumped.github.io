// Word Corpus for Markov-like Text Generation
// Customize these words to match your site's topic for better camouflage

const WORDS = [
	// Technical terms
	'algorithm', 'bandwidth', 'cache', 'database', 'encryption',
	'framework', 'gateway', 'hardware', 'interface', 'kernel',
	'latency', 'metadata', 'network', 'optimization', 'protocol',
	'query', 'runtime', 'server', 'throughput', 'validation',
	'architecture', 'configuration', 'deployment', 'infrastructure', 'middleware',
	'repository', 'schema', 'synchronization', 'transaction', 'virtualization',
	
	// Business buzzwords
	'synergy', 'paradigm', 'leverage', 'disrupt', 'innovate',
	'ecosystem', 'scalable', 'agile', 'dynamic', 'strategic',
	'seamless', 'robust', 'efficient', 'comprehensive', 'integrated',
	'holistic', 'proactive', 'collaborative', 'transformative', 'sustainable',
	'value-added', 'best-of-breed', 'mission-critical', 'next-generation', 'cutting-edge',
	
	// Common verbs
	'implement', 'develop', 'create', 'build', 'design',
	'analyze', 'optimize', 'enhance', 'streamline', 'facilitate',
	'enable', 'deliver', 'execute', 'manage', 'coordinate',
	'integrate', 'deploy', 'configure', 'monitor', 'maintain',
	'evaluate', 'assess', 'improve', 'refactor', 'troubleshoot',
	
	// Abstract nouns
	'approach', 'methodology', 'strategy', 'technique', 'practice',
	'principle', 'concept', 'theory', 'model', 'framework',
	'solution', 'system', 'platform', 'environment', 'structure',
	'foundation', 'component', 'element', 'aspect', 'dimension',
	'perspective', 'context', 'scope', 'criteria', 'standard',
	
	// General tech vocabulary
	'application', 'software', 'program', 'code', 'script',
	'module', 'library', 'package', 'resource', 'tool',
	'utility', 'service', 'endpoint', 'pipeline', 'workflow',
	'process', 'thread', 'instance', 'container', 'cluster',
	'node', 'pod', 'volume', 'namespace', 'ingress',
	
	// Quality adjectives
	'reliable', 'secure', 'stable', 'flexible', 'portable',
	'maintainable', 'testable', 'modular', 'extensible', 'reusable',
	'performant', 'responsive', 'accessible', 'compatible', 'interoperable',
	'efficient', 'effective', 'practical', 'viable', 'feasible',
	
	// Process words
	'automation', 'integration', 'migration', 'transformation', 'evolution',
	'implementation', 'deployment', 'provisioning', 'orchestration', 'coordination',
	'monitoring', 'logging', 'debugging', 'testing', 'validation',
	'verification', 'authentication', 'authorization', 'encryption', 'decryption',
	
	// Scale and scope
	'enterprise', 'distributed', 'cloud-native', 'microservices', 'serverless',
	'containerized', 'virtualized', 'federated', 'decentralized', 'centralized',
	'multi-tenant', 'single-tenant', 'hybrid', 'on-premises', 'managed',
	
	// Development concepts
	'continuous', 'incremental', 'iterative', 'agile', 'waterfall',
	'devops', 'devsecops', 'gitops', 'infrastructure-as-code', 'configuration-as-code',
	'immutable', 'declarative', 'imperative', 'functional', 'object-oriented',
	
	// Performance terms
	'throughput', 'latency', 'scalability', 'availability', 'reliability',
	'durability', 'consistency', 'concurrency', 'parallelism', 'asynchronous',
	'synchronous', 'blocking', 'non-blocking', 'event-driven', 'reactive',
	
	// Security terms
	'authentication', 'authorization', 'encryption', 'hashing', 'signing',
	'certificate', 'token', 'session', 'cookie', 'credential',
	'firewall', 'proxy', 'gateway', 'bastion', 'perimeter',
	
	// Data terms
	'structured', 'unstructured', 'semi-structured', 'relational', 'non-relational',
	'normalized', 'denormalized', 'indexed', 'partitioned', 'sharded',
	'replicated', 'cached', 'persisted', 'serialized', 'deserialized',
];

const ADJECTIVES = [
	'advanced', 'innovative', 'strategic', 'comprehensive', 'integrated',
	'efficient', 'robust', 'scalable', 'flexible', 'dynamic',
	'seamless', 'optimized', 'enhanced', 'streamlined', 'automated',
	'secure', 'reliable', 'performant', 'resilient', 'adaptive',
	'intelligent', 'sophisticated', 'elegant', 'modern', 'cutting-edge',
	'enterprise-grade', 'production-ready', 'battle-tested', 'proven', 'mature',
	'lightweight', 'powerful', 'versatile', 'extensible', 'modular',
	'cloud-native', 'distributed', 'decentralized', 'federated', 'containerized',
	'next-generation', 'state-of-the-art', 'best-in-class', 'world-class', 'industry-leading',
];

const NOUNS = [
	'solution', 'platform', 'framework', 'ecosystem', 'infrastructure',
	'architecture', 'system', 'methodology', 'approach', 'strategy',
	'implementation', 'deployment', 'configuration', 'integration', 'automation',
	'optimization', 'enhancement', 'transformation', 'migration', 'evolution',
	'service', 'application', 'component', 'module', 'library',
	'tool', 'utility', 'resource', 'pipeline', 'workflow',
	'process', 'procedure', 'protocol', 'standard', 'specification',
	'paradigm', 'model', 'pattern', 'practice', 'principle',
];

const TRANSITION_WORDS = [
	'however', 'moreover', 'furthermore', 'consequently', 'therefore',
	'nevertheless', 'accordingly', 'thus', 'hence', 'subsequently',
	'additionally', 'alternatively', 'conversely', 'similarly', 'likewise',
	'meanwhile', 'nonetheless', 'otherwise', 'specifically', 'particularly',
	'essentially', 'notably', 'significantly', 'importantly', 'interestingly',
	'indeed', 'certainly', 'undoubtedly', 'clearly', 'evidently',
	'naturally', 'obviously', 'presumably', 'apparently', 'arguably',
	'admittedly', 'surprisingly', 'ironically', 'fortunately', 'unfortunately',
	'ultimately', 'eventually', 'initially', 'finally', 'firstly',
	'secondly', 'thirdly', 'lastly', 'primarily', 'mainly',
	'generally', 'typically', 'usually', 'often', 'frequently',
	'occasionally', 'rarely', 'seldom', 'sometimes', 'always',
	'never', 'ever', 'still', 'yet', 'already',
	'just', 'only', 'even', 'also', 'too',
	'as well', 'in addition', 'in fact', 'in particular', 'in contrast',
	'on the other hand', 'for example', 'for instance', 'in other words', 'that is',
];

const SENTENCE_STARTERS = [
	'The primary objective is to',
	'Our analysis indicates that',
	'Recent developments suggest that',
	'Industry experts recommend',
	'Best practices dictate that',
	'Research has shown that',
	'It is widely recognized that',
	'Studies have demonstrated that',
	'Evidence suggests that',
	'Experience has proven that',
	'Conventional wisdom holds that',
	'Modern approaches emphasize',
	'Contemporary thinking favors',
	'Current trends indicate',
	'Emerging patterns reveal',
	'The fundamental principle behind',
	'A comprehensive understanding requires',
	'Critical evaluation demonstrates',
	'Systematic analysis reveals',
	'Empirical evidence supports',
	'Theoretical frameworks suggest',
	'Practical applications include',
	'Key considerations involve',
	'Essential components comprise',
	'Primary factors include',
	'Strategic implementation demands',
	'Effective execution requires',
	'Optimal performance depends on',
	'Successful deployment involves',
	'Core functionality centers on',
];