/**
 * Suraj Singh Portfolio - Shared Data Manager
 * Handles project CRUD operations with dual support:
 * 1. Supabase Cloud Database (for real-time multi-device cloud sync)
 * 2. LocalStorage + Fallback Default Projects (works instantly with zero config)
 */

const DEFAULT_PROJECTS = [
    {
        id: "proj_1",
        title: "Scripting and Performing",
        category: "youtube",
        badge: "YouTube & Scripting",
        badgeColor: "brand",
        videoSrc: "./img/scripting_performing.mp4",
        description: "Complete conceptual scripting, on-camera execution, and storytelling edit structured for maximum retention.",
        order: 1
    },
    {
        id: "proj_2",
        title: "Motion Graphics + Sound Design",
        category: "motion",
        badge: "Motion & Sound",
        badgeColor: "purple",
        videoSrc: "./img/motion_graphics_sound_design.mp4",
        description: "High-energy kinetic typography, custom sound design layer, and After Effects visual enhancements.",
        order: 2
    },
    {
        id: "proj_3",
        title: "Music + Motion Graphics",
        category: "motion",
        badge: "Music Sync & Animation",
        badgeColor: "cyan",
        videoSrc: "./img/music_motion_graphics.mp4",
        description: "Beat-synced cuts, dynamic shape transitions, and rhythm-focused audio editing for visual impact.",
        order: 3
    },
    {
        id: "proj_4",
        title: "New Shapes & Micro Design",
        category: "motion",
        badge: "Micro Animations",
        badgeColor: "emerald",
        videoSrc: "./img/new_shapes_micro_design.mp4",
        description: "Subtle UI element overlays, vector shape animations, and clean visual lower-thirds.",
        order: 4
    },
    {
        id: "proj_5",
        title: "Vertical Commercial Ads",
        category: "reels",
        badge: "Commercial Ads / 9:16",
        badgeColor: "amber",
        videoSrc: "./img/vertical_ads.mp4",
        description: "Short-form high-converting vertical ad edits tailored for Instagram Reels, Shorts, and TikTok.",
        order: 5
    },
    {
        id: "proj_6",
        title: "Viral Clip Selection & Pacing",
        category: "reels",
        badge: "Viral Pacing & Curation",
        badgeColor: "rose",
        videoSrc: "./img/viral_clip_selection.mp4",
        description: "Engaging hook curation, fast-paced transitions, captions, and high-retention edit structure.",
        order: 6
    }
];

const DEFAULT_PROFILE_CONFIG = {
    name: "Suraj Singh",
    role: "Professional Video Editor & Content Creator",
    whatsapp: "919304185885",
    email: "shinesuraj0993@gmail.com",
    phone: "+91 9304185885",
    location: "Ranchi, Jharkhand, India",
    heroHeadline: "Transforming Raw Footage Into High-Retention Visual Masterpieces",
    heroSubtext: "I craft viral shorts, cinematic commercial ads, beat-synced motion graphics, and engaging long-form YouTube stories designed to captivate your audience."
};

const STORAGE_KEY = "suraj_portfolio_projects";
const PROFILE_KEY = "suraj_portfolio_profile";
const SETTINGS_KEY = "suraj_portfolio_settings";
const AUTH_KEY = "suraj_admin_authenticated";
const PIN_KEY = "suraj_admin_pin";
const DEFAULT_PIN = "0993"; // Default admin PIN

class PortfolioDataManager {
    constructor() {
        this.supabase = null;
        this.initSupabase();
    }

    // Initialize Supabase if credentials exist
    initSupabase() {
        const settings = this.getSettings();
        if (settings.supabaseUrl && settings.supabaseKey && window.supabase) {
            try {
                this.supabase = window.supabase.createClient(settings.supabaseUrl, settings.supabaseKey);
            } catch (err) {
                console.warn("Supabase init error:", err);
                this.supabase = null;
            }
        }
    }

    getProfileConfig() {
        try {
            const raw = localStorage.getItem(PROFILE_KEY);
            return raw ? { ...DEFAULT_PROFILE_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_PROFILE_CONFIG };
        } catch (e) {
            return { ...DEFAULT_PROFILE_CONFIG };
        }
    }

    async saveProfileConfig(config) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(config));
        if (this.supabase) {
            try {
                await this.supabase.from("site_config").upsert([{ id: "profile", ...config }]);
            } catch (err) {
                console.warn("Supabase site_config sync:", err);
            }
        }
    }

    getSettings() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            return raw ? JSON.parse(raw) : { supabaseUrl: "", supabaseKey: "", autoSync: false };
        } catch (e) {
            return { supabaseUrl: "", supabaseKey: "", autoSync: false };
        }
    }

    saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        this.initSupabase();
    }

    getAdminPin() {
        return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
    }

    setAdminPin(newPin) {
        localStorage.setItem(PIN_KEY, String(newPin).trim());
    }

    isAuthenticated() {
        return sessionStorage.getItem(AUTH_KEY) === "true";
    }

    login(pin) {
        const currentPin = this.getAdminPin();
        if (String(pin).trim() === currentPin) {
            sessionStorage.setItem(AUTH_KEY, "true");
            return true;
        }
        return false;
    }

    logout() {
        sessionStorage.removeItem(AUTH_KEY);
    }

    // Retrieve all projects
    async getProjects() {
        // If Supabase is connected, fetch from cloud
        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from("projects")
                    .select("*")
                    .order("order", { ascending: true });

                if (!error && Array.isArray(data) && data.length > 0) {
                    return data;
                }
            } catch (err) {
                console.warn("Error fetching from Supabase, falling back to local:", err);
            }
        }

        // LocalStorage fallback
        try {
            const localData = localStorage.getItem(STORAGE_KEY);
            if (localData) {
                const parsed = JSON.parse(localData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.sort((a, b) => (a.order || 0) - (b.order || 0));
                }
            }
        } catch (e) {
            console.error("Error reading localStorage:", e);
        }

        // Default initial projects
        return [...DEFAULT_PROJECTS];
    }

    // Save all projects locally and sync to cloud if available
    async saveAllProjects(projects) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

        if (this.supabase) {
            try {
                // Upsert projects to Supabase
                const { error } = await this.supabase.from("projects").upsert(projects);
                if (error) console.error("Supabase upsert error:", error);
            } catch (err) {
                console.error("Supabase sync failed:", err);
            }
        }
    }

    // Add a single new project
    async addProject(project) {
        const projects = await this.getProjects();
        const src = (project.videoSrc || '').trim();
        const isImg = project.mediaType === 'image' || 
                      /\.(png|jpe?g|webp|gif|svg)$/i.test(src) || 
                      src.startsWith('data:image/');

        const newProject = {
            id: project.id || "proj_" + Date.now(),
            title: project.title.trim(),
            category: project.category || "youtube",
            badge: project.badge || "Featured Edit",
            badgeColor: project.badgeColor || "brand",
            videoSrc: src,
            mediaType: isImg ? 'image' : 'video',
            description: project.description.trim(),
            order: projects.length + 1,
            createdAt: new Date().toISOString()
        };

        projects.push(newProject);
        await this.saveAllProjects(projects);
        return newProject;
    }

    // Update an existing project
    async updateProject(id, updatedFields) {
        let projects = await this.getProjects();
        const index = projects.findIndex(p => p.id === id);
        if (index === -1) throw new Error("Project not found");

        const src = (updatedFields.videoSrc !== undefined ? updatedFields.videoSrc : projects[index].videoSrc || '').trim();
        const isImg = updatedFields.mediaType === 'image' || 
                      /\.(png|jpe?g|webp|gif|svg)$/i.test(src) || 
                      src.startsWith('data:image/');

        projects[index] = {
            ...projects[index],
            ...updatedFields,
            videoSrc: src,
            mediaType: isImg ? 'image' : 'video',
            updatedAt: new Date().toISOString()
        };

        await this.saveAllProjects(projects);
        return projects[index];
    }

    // Delete a project
    async deleteProject(id) {
        let projects = await this.getProjects();
        projects = projects.filter(p => p.id !== id);
        
        // Re-index order
        projects.forEach((p, idx) => {
            p.order = idx + 1;
        });

        await this.saveAllProjects(projects);

        if (this.supabase) {
            try {
                await this.supabase.from("projects").delete().eq("id", id);
            } catch (err) {
                console.error("Supabase delete failed:", err);
            }
        }
    }

    // Reorder projects
    async reorderProject(id, direction) {
        let projects = await this.getProjects();
        const index = projects.findIndex(p => p.id === id);
        if (index === -1) return;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= projects.length) return;

        // Swap
        const temp = projects[index];
        projects[index] = projects[targetIndex];
        projects[targetIndex] = temp;

        // Re-index order
        projects.forEach((p, idx) => {
            p.order = idx + 1;
        });

        await this.saveAllProjects(projects);
        return projects;
    }

    // Reset all projects back to original default 6 projects
    async resetToDefaults() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS));
        if (this.supabase) {
            try {
                await this.supabase.from("projects").delete().neq("id", "none");
                await this.supabase.from("projects").upsert(DEFAULT_PROJECTS);
            } catch (err) {
                console.error("Supabase reset error:", err);
            }
        }
        return [...DEFAULT_PROJECTS];
    }
}

// Global singleton instance
window.portfolioData = new PortfolioDataManager();
