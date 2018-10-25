import * as elasticsearch from 'elasticsearch'

const CreateIndexQuery = {
    "aliases": {
        "archive": {}
    },
    "mappings": {
        "_doc": {
            "dynamic_templates": [
                {
                    "disable_dynamic_indexing": {
                        "match_mapping_type": "*",
                        "mapping": {
                            "index": false,
                            "type": "{dynamic_type}"
                        }
                    }
                }
            ],
            "properties": {
                "type": {
                    "type": "keyword"
                },
                "created": {
                    "type": "date"
                },
                "deleted": {
                    "type": "date"
                },
                "fulltext": {
                    "type": "text",
                    "analyzer": "ik_max_word",
                    "search_analyzer": "ik_max_word"                    
                },
                "tags": {
                    "type": "keyword"
                },
                "from": {
                    "type": "text",
                    "analyzer": "lowercase_with_stopwords"
                }
            }
        }
    },
    "settings": {
        "index": {
            "number_of_shards": "1",
            "number_of_replicas": "0",
        },
        "analysis": {
            "filter": {
                "stopwords_filter": {
                    "type": "stop",
                    "stopwords": [
                        "http",
                        "https",
                        "ftp",
                        "www"
                    ]
                }
            },
            "analyzer": {
                "lowercase_with_stopwords": {
                    "filter": [
                        "stopwords_filter"
                    ],
                    "type": "custom",
                    "tokenizer": "lowercase"
                }
            }
        }
    }
}

const BackupDir = "/usr/share/elasticsearch/data/backups"

const SnapshotRepoCreateQuery = {
    "type": "fs",
    "settings": {
        "location": BackupDir
    }
}


export async function initES(conn: elasticsearch.Client) {
    logger("Store init").info("Initializing ES")
    await conn.indices.create({
        index: "collection-" + Date.now().toString(),
        body: CreateIndexQuery
    })
    await conn.snapshot.createRepository({
        repository: "archive_backups",
        body: SnapshotRepoCreateQuery
    })
}
