import { createImageRegistry } from './ImageRegistry'
import type { ImageManifest } from './seedRegistry'

// ═══════════════════════════════════════════════════════════════════════════
// CONTAINER REGISTRY PANEL UI COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
// Factory function that creates a collapsible panel showing available
// container images from the registry.

interface RegistryPanel {
    destroy: () => void
}

export const createRegistryPanel = (container: HTMLElement): RegistryPanel => {
    const imageRegistry = createImageRegistry()
    const images = imageRegistry.listAllImages()

    // Create card container
    const card = document.createElement('div')
    card.className = 'card bg-base-100 shadow-sm mt-4'
    
    const cardBody = document.createElement('div')
    cardBody.className = 'card-body p-4'

    // Create collapsible header
    const header = document.createElement('div')
    header.className = 'flex items-center justify-between cursor-pointer'
    header.setAttribute('role', 'button')
    header.setAttribute('tabindex', '0')
    
    const titleDiv = document.createElement('div')
    titleDiv.className = 'flex items-center gap-2'
    
    const title = document.createElement('h3')
    title.className = 'card-title text-sm text-info'
    title.innerHTML = '📦 Container Registry'
    
    const badge = document.createElement('div')
    badge.className = 'badge badge-sm badge-info'
    badge.textContent = `${images.length} images`
    
    titleDiv.appendChild(title)
    titleDiv.appendChild(badge)
    
    const chevron = document.createElement('svg')
    chevron.className = 'h-5 w-5 transition-transform'
    chevron.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    chevron.setAttribute('fill', 'none')
    chevron.setAttribute('viewBox', '0 0 24 24')
    chevron.setAttribute('stroke', 'currentColor')
    chevron.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />'
    
    header.appendChild(titleDiv)
    header.appendChild(chevron)

    // Create collapsible content
    const content = document.createElement('div')
    content.className = 'mt-4 space-y-2 hidden'
    content.id = 'registry-content'

    // Group images by registry
    const imagesByRegistry = groupImagesByRegistry(images)

    imagesByRegistry.forEach((registryImages, registry) => {
        // Registry section
        const registrySection = document.createElement('div')
        registrySection.className = 'mb-3'
        
        const registryTitle = document.createElement('div')
        registryTitle.className = 'text-xs font-semibold text-base-content/60 mb-2'
        registryTitle.textContent = registry
        registrySection.appendChild(registryTitle)

        // Images in this registry
        registryImages.forEach((img) => {
            const imageCard = createImageCard(img)
            registrySection.appendChild(imageCard)
        })

        content.appendChild(registrySection)
    })

    // Toggle collapse functionality
    const toggleCollapse = () => {
        const isHidden = content.classList.contains('hidden')
        if (isHidden) {
            content.classList.remove('hidden')
            chevron.classList.add('rotate-180')
        } else {
            content.classList.add('hidden')
            chevron.classList.remove('rotate-180')
        }
    }

    header.onclick = toggleCollapse
    header.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleCollapse()
        }
    }

    cardBody.appendChild(header)
    cardBody.appendChild(content)
    card.appendChild(cardBody)
    container.appendChild(card)

    // Cleanup function
    const destroy = () => {
        container.removeChild(card)
    }

    return { destroy }
}

// Group images by registry
const groupImagesByRegistry = (images: ImageManifest[]): Map<string, ImageManifest[]> => {
    const grouped = new Map<string, ImageManifest[]>()
    
    images.forEach((img) => {
        const existing = grouped.get(img.registry) || []
        existing.push(img)
        grouped.set(img.registry, existing)
    })

    return grouped
}

// Create individual image card
const createImageCard = (image: ImageManifest): HTMLElement => {
    const imageDiv = document.createElement('div')
    imageDiv.className = 'bg-base-200 rounded-lg p-3 text-xs space-y-1'

    // Image name
    const nameLine = document.createElement('div')
    nameLine.className = 'font-mono font-semibold text-accent'
    nameLine.textContent = `${image.registry}/${image.name}`
    imageDiv.appendChild(nameLine)

    // Tags
    const tagsLine = document.createElement('div')
    tagsLine.className = 'flex flex-wrap gap-1 items-center'
    
    const tagsLabel = document.createElement('span')
    tagsLabel.className = 'text-base-content/60'
    tagsLabel.textContent = 'Tags:'
    tagsLine.appendChild(tagsLabel)
    
    image.tags.forEach((tag) => {
        const tagBadge = document.createElement('span')
        tagBadge.className = 'badge badge-xs badge-outline'
        tagBadge.textContent = tag
        tagsLine.appendChild(tagBadge)
    })
    imageDiv.appendChild(tagsLine)

    // Ports (if any)
    if (image.defaultPorts.length > 0) {
        const portsLine = document.createElement('div')
        portsLine.className = 'text-base-content/60'
        portsLine.textContent = `Ports: ${image.defaultPorts.join(', ')}`
        imageDiv.appendChild(portsLine)
    }

    // Default status
    const statusLine = document.createElement('div')
    statusLine.className = 'flex items-center gap-2'
    
    const statusLabel = document.createElement('span')
    statusLabel.className = 'text-base-content/60'
    statusLabel.textContent = 'Status:'
    
    const statusBadge = document.createElement('span')
    const statusClass = image.behavior.defaultStatus === 'Running' ? 'badge-success' : 'badge-warning'
    statusBadge.className = `badge badge-xs ${statusClass}`
    statusBadge.textContent = image.behavior.defaultStatus
    
    statusLine.appendChild(statusLabel)
    statusLine.appendChild(statusBadge)
    imageDiv.appendChild(statusLine)

    return imageDiv
}

