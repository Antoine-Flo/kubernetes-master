import { describe, it, expect, beforeEach } from 'vitest'
import {
    createFileSystem,
    resolvePath,
    getDepth,
    validateFilename,
    findNode,
    type FileSystemState
} from '../../src/filesystem/FileSystem'
import { createDirectory, createFile } from '../../src/filesystem/models'

describe('FileSystem - Pure Functions', () => {
    describe('resolvePath', () => {
        it('should return absolute path as-is', () => {
            expect(resolvePath('/current', '/manifests')).toBe('/manifests')
            expect(resolvePath('/a/b', '/x/y/z')).toBe('/x/y/z')
        })

        it('should resolve relative path', () => {
            expect(resolvePath('/manifests', 'pod.yaml')).toBe('/manifests/pod.yaml')
            expect(resolvePath('/examples', 'subdir')).toBe('/examples/subdir')
        })

        it('should handle parent directory (..)', () => {
            expect(resolvePath('/manifests/dev', '..')).toBe('/manifests')
            expect(resolvePath('/a/b/c', '..')).toBe('/a/b')
        })

        it('should handle root parent directory', () => {
            expect(resolvePath('/', '..')).toBe('/')
        })

        it('should handle current directory (.)', () => {
            expect(resolvePath('/manifests', '.')).toBe('/manifests')
        })

        it('should handle complex relative paths', () => {
            expect(resolvePath('/a/b/c', '../d')).toBe('/a/b/d')
            expect(resolvePath('/a/b/c', '../../d')).toBe('/a/d')
        })

        it('should normalize multiple slashes', () => {
            expect(resolvePath('/manifests', '//pod.yaml')).toBe('/pod.yaml')
        })

        it('should handle trailing slashes', () => {
            expect(resolvePath('/manifests/', 'pod.yaml')).toBe('/manifests/pod.yaml')
        })
    })

    describe('getDepth', () => {
        it('should return 0 for root', () => {
            expect(getDepth('/')).toBe(0)
        })

        it('should return 1 for first level', () => {
            expect(getDepth('/manifests')).toBe(1)
        })

        it('should return 2 for second level', () => {
            expect(getDepth('/manifests/dev')).toBe(2)
        })

        it('should return 3 for third level', () => {
            expect(getDepth('/manifests/dev/pods')).toBe(3)
        })

        it('should handle trailing slash', () => {
            expect(getDepth('/manifests/dev/')).toBe(2)
        })
    })

    describe('validateFilename', () => {
        it('should accept valid filenames', () => {
            expect(validateFilename('pod.yaml')).toBe(true)
            expect(validateFilename('my-deployment.yml')).toBe(true)
            expect(validateFilename('service_v2.json')).toBe(true)
            expect(validateFilename('config.kyaml')).toBe(true)
        })

        it('should accept alphanumeric characters', () => {
            expect(validateFilename('abc123.yaml')).toBe(true)
            expect(validateFilename('Test123.json')).toBe(true)
        })

        it('should accept hyphens and underscores', () => {
            expect(validateFilename('my-file.yaml')).toBe(true)
            expect(validateFilename('my_file.yaml')).toBe(true)
            expect(validateFilename('my-file_name.yaml')).toBe(true)
        })

        it('should accept dots in filename', () => {
            expect(validateFilename('my.app.yaml')).toBe(true)
        })

        it('should reject spaces', () => {
            expect(validateFilename('my file.yaml')).toBe(false)
        })

        it('should reject forbidden characters', () => {
            expect(validateFilename('file*.yaml')).toBe(false)
            expect(validateFilename('file?.yaml')).toBe(false)
            expect(validateFilename('file<.yaml')).toBe(false)
            expect(validateFilename('file>.yaml')).toBe(false)
            expect(validateFilename('file|.yaml')).toBe(false)
        })

        it('should reject empty filename', () => {
            expect(validateFilename('')).toBe(false)
        })
    })

    describe('findNode', () => {
        let tree: ReturnType<typeof createDirectory>

        beforeEach(() => {
            tree = createDirectory('root', '/')
            const examples = createDirectory('examples', '/examples')
            const file = createFile('pod.yaml', '/examples/pod.yaml', 'content')
            examples.children.set('pod.yaml', file)
            tree.children.set('examples', examples)
        })

        it('should find root', () => {
            const node = findNode(tree, '/')
            expect(node).toBe(tree)
        })

        it('should find directory', () => {
            const node = findNode(tree, '/examples')
            expect(node?.type).toBe('directory')
            expect(node?.name).toBe('examples')
        })

        it('should find file', () => {
            const node = findNode(tree, '/examples/pod.yaml')
            expect(node?.type).toBe('file')
            expect(node?.name).toBe('pod.yaml')
        })

        it('should return undefined for non-existent path', () => {
            const node = findNode(tree, '/notfound')
            expect(node).toBeUndefined()
        })

        it('should return undefined for nested non-existent path', () => {
            const node = findNode(tree, '/examples/notfound.yaml')
            expect(node).toBeUndefined()
        })
    })
})

describe('FileSystem - Facade', () => {
    let fs: ReturnType<typeof createFileSystem>

    beforeEach(() => {
        fs = createFileSystem()
    })

    describe('getCurrentPath', () => {
        it('should start at root', () => {
            expect(fs.getCurrentPath()).toBe('/')
        })
    })

    describe('changeDirectory', () => {
        it('should change to absolute path', () => {
            fs.createDirectory('manifests')
            const result = fs.changeDirectory('/manifests')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('/manifests')
            }
            expect(fs.getCurrentPath()).toBe('/manifests')
        })

        it('should change to relative path', () => {
            fs.createDirectory('manifests')
            fs.changeDirectory('/manifests')
            fs.createDirectory('dev')

            const result = fs.changeDirectory('dev')
            expect(result.ok).toBe(true)
            expect(fs.getCurrentPath()).toBe('/manifests/dev')
        })

        it('should handle parent directory', () => {
            fs.createDirectory('manifests')
            fs.changeDirectory('/manifests')

            const result = fs.changeDirectory('..')
            expect(result.ok).toBe(true)
            expect(fs.getCurrentPath()).toBe('/')
        })

        it('should return error for non-existent directory', () => {
            const result = fs.changeDirectory('/notfound')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
            }
            expect(fs.getCurrentPath()).toBe('/')
        })

        it('should return error when trying to cd into file', () => {
            fs.createFile('pod.yaml')

            const result = fs.changeDirectory('/pod.yaml')
            expect(result.ok).toBe(false)
            expect(fs.getCurrentPath()).toBe('/')
        })
    })

    describe('listDirectory', () => {
        it('should list root directory', () => {
            const result = fs.listDirectory()

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toEqual([])
            }
        })

        it('should list directory contents', () => {
            fs.createDirectory('manifests')
            fs.createDirectory('examples')

            const result = fs.listDirectory()
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toHaveLength(2)
                expect(result.value.map(n => n.name)).toContain('manifests')
                expect(result.value.map(n => n.name)).toContain('examples')
            }
        })

        it('should list specific directory', () => {
            fs.createDirectory('manifests')
            fs.changeDirectory('/manifests')
            fs.createFile('pod.yaml')

            const result = fs.listDirectory('/manifests')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toHaveLength(1)
                expect(result.value[0].name).toBe('pod.yaml')
            }
        })

        it('should return error for non-existent directory', () => {
            const result = fs.listDirectory('/notfound')
            expect(result.ok).toBe(false)
        })

        it('should return error when listing file', () => {
            fs.createFile('pod.yaml')
            const result = fs.listDirectory('/pod.yaml')
            expect(result.ok).toBe(false)
        })
    })

    describe('createDirectory', () => {
        it('should create directory in current path', () => {
            const result = fs.createDirectory('manifests')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('/manifests')
            }

            const list = fs.listDirectory()
            if (list.ok) {
                expect(list.value).toHaveLength(1)
                expect(list.value[0].name).toBe('manifests')
            }
        })

        it('should create nested directory', () => {
            fs.createDirectory('manifests')
            fs.changeDirectory('/manifests')
            const result = fs.createDirectory('dev')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('/manifests/dev')
            }
        })

        it('should create directory recursively with -p flag', () => {
            const result = fs.createDirectory('manifests/dev/pods', true)

            expect(result.ok).toBe(true)
            expect(fs.changeDirectory('/manifests/dev/pods').ok).toBe(true)
        })

        it('should enforce max depth of 3', () => {
            const result = fs.createDirectory('a/b/c/d', true)

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Max depth')
            }
        })

        it('should return error if directory already exists', () => {
            fs.createDirectory('manifests')
            const result = fs.createDirectory('manifests')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('already exists')
            }
        })

        it('should return error if parent does not exist (non-recursive)', () => {
            const result = fs.createDirectory('a/b/c', false)

            expect(result.ok).toBe(false)
        })

        it('should validate directory name', () => {
            const result = fs.createDirectory('invalid name')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Invalid')
            }
        })
    })

    describe('createFile', () => {
        it('should create file in current directory', () => {
            const result = fs.createFile('pod.yaml')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.name).toBe('pod.yaml')
                expect(result.value.path).toBe('/pod.yaml')
                expect(result.value.content).toBe('')
            }
        })

        it('should create file with content', () => {
            const result = fs.createFile('pod.yaml', 'apiVersion: v1')

            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value.content).toBe('apiVersion: v1')
            }
        })

        it('should create file with various extensions', () => {
            expect(fs.createFile('pod.yaml').ok).toBe(true)
            expect(fs.createFile('deploy.yml').ok).toBe(true)
            expect(fs.createFile('service.json').ok).toBe(true)
            expect(fs.createFile('config.kyaml').ok).toBe(true)
        })

        it('should return error for unsupported extension', () => {
            const result = fs.createFile('readme.txt')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('Unsupported')
            }
        })

        it('should return error if file already exists', () => {
            fs.createFile('pod.yaml')
            const result = fs.createFile('pod.yaml')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('already exists')
            }
        })

        it('should validate filename', () => {
            const result = fs.createFile('invalid file.yaml')

            expect(result.ok).toBe(false)
        })

        it('should enforce max depth', () => {
            // Create directories up to max depth (3)
            fs.createDirectory('a/b/c', true)
            fs.changeDirectory('/a/b/c')

            // Should be able to create file at depth 3
            const result = fs.createFile('file.yaml')
            expect(result.ok).toBe(true)

            // Depth 4 would exceed max, so can't create directory there
            const dirResult = fs.createDirectory('d')
            expect(dirResult.ok).toBe(false)
            if (!dirResult.ok) {
                expect(dirResult.error).toContain('Max depth')
            }
        })
    })

    describe('readFile', () => {
        it('should read file content', () => {
            fs.createFile('pod.yaml', 'apiVersion: v1')

            const result = fs.readFile('/pod.yaml')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('apiVersion: v1')
            }
        })

        it('should read file with relative path', () => {
            fs.createFile('pod.yaml', 'content')

            const result = fs.readFile('pod.yaml')
            expect(result.ok).toBe(true)
            if (result.ok) {
                expect(result.value).toBe('content')
            }
        })

        it('should return error for non-existent file', () => {
            const result = fs.readFile('/notfound.yaml')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not found')
            }
        })

        it('should return error when trying to read directory', () => {
            fs.createDirectory('manifests')
            const result = fs.readFile('/manifests')

            expect(result.ok).toBe(false)
        })
    })

    describe('writeFile', () => {
        it('should update file content', () => {
            fs.createFile('pod.yaml', 'old content')

            const result = fs.writeFile('/pod.yaml', 'new content')
            expect(result.ok).toBe(true)

            const read = fs.readFile('/pod.yaml')
            if (read.ok) {
                expect(read.value).toBe('new content')
            }
        })

        it('should return error for non-existent file', () => {
            const result = fs.writeFile('/notfound.yaml', 'content')

            expect(result.ok).toBe(false)
        })

        it('should return error when trying to write to directory', () => {
            fs.createDirectory('manifests')
            const result = fs.writeFile('/manifests', 'content')

            expect(result.ok).toBe(false)
        })
    })

    describe('deleteFile', () => {
        it('should delete file', () => {
            fs.createFile('pod.yaml')

            const result = fs.deleteFile('/pod.yaml')
            expect(result.ok).toBe(true)

            const list = fs.listDirectory()
            if (list.ok) {
                expect(list.value).toHaveLength(0)
            }
        })

        it('should return error for non-existent file', () => {
            const result = fs.deleteFile('/notfound.yaml')
            expect(result.ok).toBe(false)
        })

        it('should return error when trying to delete directory', () => {
            fs.createDirectory('manifests')
            const result = fs.deleteFile('/manifests')

            expect(result.ok).toBe(false)
        })
    })

    describe('deleteDirectory', () => {
        it('should delete empty directory', () => {
            fs.createDirectory('manifests')

            const result = fs.deleteDirectory('/manifests')
            expect(result.ok).toBe(true)

            const list = fs.listDirectory()
            if (list.ok) {
                expect(list.value).toHaveLength(0)
            }
        })

        it('should return error when deleting non-empty directory without recursive flag', () => {
            fs.createDirectory('manifests')
            fs.changeDirectory('/manifests')
            fs.createFile('pod.yaml')

            const result = fs.deleteDirectory('/manifests', false)
            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('not empty')
            }
        })

        it('should delete directory recursively', () => {
            fs.createDirectory('manifests')
            fs.changeDirectory('/manifests')
            fs.createFile('pod.yaml')
            fs.createDirectory('dev')

            const result = fs.deleteDirectory('/manifests', true)
            expect(result.ok).toBe(true)

            fs.changeDirectory('/')
            const list = fs.listDirectory()
            if (list.ok) {
                expect(list.value).toHaveLength(0)
            }
        })

        it('should return error for non-existent directory', () => {
            const result = fs.deleteDirectory('/notfound')
            expect(result.ok).toBe(false)
        })

        it('should return error when trying to delete file', () => {
            fs.createFile('pod.yaml')
            const result = fs.deleteDirectory('/pod.yaml')

            expect(result.ok).toBe(false)
        })

        it('should return error when trying to delete root', () => {
            const result = fs.deleteDirectory('/')

            expect(result.ok).toBe(false)
            if (!result.ok) {
                expect(result.error).toContain('root')
            }
        })
    })

    describe('toJSON and loadState', () => {
        it('should serialize state to JSON', () => {
            fs.createDirectory('manifests')
            fs.createFile('pod.yaml', 'content')

            const state = fs.toJSON()
            expect(state.currentPath).toBe('/')
            expect(state.tree.type).toBe('directory')
        })

        it('should load state from JSON', () => {
            fs.createDirectory('manifests')
            fs.createFile('pod.yaml', 'content')
            const state = fs.toJSON()

            const fs2 = createFileSystem()
            fs2.loadState(state)

            expect(fs2.getCurrentPath()).toBe('/')
            const list = fs2.listDirectory()
            if (list.ok) {
                expect(list.value).toHaveLength(2)
            }
        })

        it('should preserve state immutability', () => {
            fs.createFile('pod.yaml', 'content')
            const state1 = fs.toJSON()

            fs.createFile('deploy.yaml')
            const state2 = fs.toJSON()

            // state1 should not be affected
            expect(state1.tree.children.size).toBe(1)
            expect(state2.tree.children.size).toBe(2)
        })
    })
})

