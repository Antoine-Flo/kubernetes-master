# ☸️ Kube Simulator

**Master kubectl commands in a safe, interactive browser environment**

Practice Kubernetes commands without the complexity of setting up a real cluster. Kube Simulator provides a fully functional virtual Kubernetes environment that runs entirely in your browser.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tests](https://img.shields.io/badge/tests-798%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-~94%25-brightgreen)

---

## ✨ Why Choose Kube Simulator?

Perfect for **students**, **developers**, and **DevOps engineers** who want to:

- 🎯 **Learn kubectl** without fear of breaking production
- 💰 **Zero cost** - no cloud fees, no local cluster setup
- ⚡ **Instant feedback** - see results immediately
- 🔄 **Experiment freely** - reset and try again anytime
- 📚 **Build confidence** before touching real clusters
- 🏠 **Practice anywhere** - works offline in your browser

---

## 🎮 Features

### kubectl Commands
- ✅ **Resource Management** - `get`, `describe`, `delete`, `create`, `apply`
- ✅ **Debugging Tools** - `logs` with `--tail` and `-f` (follow), `exec -it` for interactive shells
- ✅ **Multiple Resources** - Pods, Deployments, Services, ConfigMaps, Secrets, Namespaces
- ✅ **Advanced Filtering** - Namespace selection (`-n`), label selectors (`-l`), output formats
- ✅ **Real-time Simulation** - Pod lifecycle, health probes, dynamic log generation

### Shell & Filesystem
- 📁 **Unix-like Filesystem** - `cd`, `ls`, `pwd`, `mkdir`, `touch`, `cat`, `rm`
- 📝 **YAML Editor** - Built-in editor with syntax highlighting (nano/vi/vim)
- 💾 **Persistent Storage** - Auto-save cluster state and files

### Developer Experience
- 🔍 **Tab Completion** - Bash-like autocomplete for commands, resources, and files
- ⌨️ **Command History** - Navigate with ↑/↓ arrows
- 🎨 **Modern UI** - Beautiful dark theme, responsive design
- 🐛 **Debug Mode** - Application logs accessible via `debug` command

---

## 🚀 Getting Started

### Option 1: Try Online (Recommended)
Visit **[kube-simulator.dev](#)** and start practicing immediately - no installation required!

### Option 2: Run Locally

```bash
# Clone and install
git clone https://github.com/Antoine-Flo/kubernetes-master.git
cd kubernetes-master
npm install

# Start the simulator
npm run dev
```

Open `http://localhost:5173` in your browser and you're ready to go!

---

## 📖 Usage Guide

### Your First Commands

Start by exploring the pre-configured cluster:

```bash
# List all pods
kubectl get pods

# See detailed information
kubectl describe pod nginx-deployment-7s8f

# View pod logs
kubectl logs nginx-deployment-7s8f

# Follow logs in real-time
kubectl logs nginx-deployment-7s8f -f
```

### Create Your First Pod

```bash
# Browse example manifests
cd examples
ls

# View an example
cat pod-example.yaml

# Apply it to the cluster
kubectl apply -f pod-example.yaml

# Verify it's running
kubectl get pods
```

### Debug a Pod

```bash
# Check pod status
kubectl describe pod my-pod

# View recent logs
kubectl logs my-pod --tail 20

# Execute commands inside the pod
kubectl exec -it my-pod -- env
kubectl exec -it my-pod -- ls /app
```

### Work with ConfigMaps & Secrets

```bash
# List configuration resources
kubectl get configmaps
kubectl get secrets

# View details
kubectl describe configmap app-config
kubectl describe secret db-credentials
```

---

## 💡 Tips & Tricks

### Use Tab Completion
Press `Tab` to autocomplete commands, resource names, and file paths - just like a real terminal!

### Command History
Use ↑ and ↓ arrow keys to navigate through your command history.

### Editor Shortcuts
- Open a YAML file: `nano pod.yaml` or `vi pod.yaml`
- Save changes and exit: `Ctrl+S` then `Ctrl+Q`

### Explore Examples
The simulator comes with pre-configured examples in the `/examples` directory. Use them as templates for your own resources.

### Reset the Cluster
Use the `debug clear` command to reset the cluster to its initial state if you want to start fresh.

---

## 🎓 Learning Path

### Beginner
1. Explore the cluster with `kubectl get` commands
2. Inspect resources with `kubectl describe`
3. View pod logs with `kubectl logs`

### Intermediate
4. Create resources from YAML files
5. Modify existing resources with `kubectl apply`
6. Work with ConfigMaps and Secrets
7. Use label selectors to filter resources

### Advanced
8. Debug pods with `kubectl exec`
9. Monitor logs in real-time with `-f` flag
10. Manage multiple namespaces
11. Understand pod lifecycle and health probes

---

## ❓ FAQ

**Q: Do I need Docker or Kubernetes installed?**  
A: No! Everything runs in your browser. No installation required.

**Q: Will my changes persist?**  
A: Yes, your cluster state and files are automatically saved to your browser's local storage.

**Q: Can I break anything?**  
A: Nope! This is a completely isolated simulation. Experiment freely without any risk.

**Q: Is this suitable for CKA/CKAD exam prep?**  
A: Yes! It's perfect for practicing kubectl commands and YAML syntax before taking certification exams.

**Q: Can I use custom YAML manifests?**  
A: Absolutely! Create your own YAML files using the built-in editor and apply them with `kubectl apply -f`.

---

## 🗺️ What's Next?

Upcoming features we're working on:
- 🏷️ Labels and annotations management
- 🔄 StatefulSets and Jobs
- 📦 Persistent Volumes (PV/PVC)
- 🎯 Interactive challenges and tutorials
- 🎨 Visual cluster representation
- 🌐 Multi-container pods

See our [roadmap](doc/roadmap.md) for detailed plans.

---

## 🤝 Contributing

Want to help improve Kube Simulator? We welcome contributions!

Check out our [contributing guidelines](CONTRIBUTING.md) to get started.

---

## 📚 Additional Resources

- [Kubernetes Official Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Interactive kubectl Tutorial](https://kubernetes.io/docs/tutorials/kubernetes-basics/)

---

## 📄 License

MIT License - Free for personal and educational use.

---

<div align="center">

**Built with ❤️ for the Kubernetes learning community**

⭐ Star this repo if you find it useful!

[Report Bug](https://github.com/Antoine-Flo/kubernetes-master/issues) · [Request Feature](https://github.com/Antoine-Flo/kubernetes-master/issues) · [Documentation](doc/spec.md)

</div>
