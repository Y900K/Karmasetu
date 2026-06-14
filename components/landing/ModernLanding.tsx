"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

const translations: Record<string, { en: string; hi: string }> = {
    "brand.text": { en: "Karmasetu", hi: "कर्मसेतु" },
    "nav.platform": { en: "Platform", hi: "मंच" },
    "nav.modules": { en: "Modules", hi: "मॉड्यूल" },
    "nav.about": { en: "About", hi: "के बारे में" },
    "btn.login": { en: "Platform Access", hi: "प्लेटफॉर्म एक्सेस" },
    "hero.badge": { en: "AI-INTEGRATED PLATFORM", hi: "एआई-एकीकृत प्लेटफॉर्म" },
    "hero.title": { en: "Next-Gen Training for <br><span class=\"highlight\">Chemical Plants</span>", hi: "रासायनिक संयंत्रों के लिए <br><span class=\"highlight\">नेक्स्ट-जेन प्रशिक्षण</span>" },
    "hero.subtitle": { en: "Upskill your workforce with hyper-realistic simulations, 3D environments, and AI-driven safety protocols. Reduce downtime and achieve zero incidents.", hi: "अति-यथार्थवादी सिमुलेशन, 3डी वातावरण और एआई-संचालित सुरक्षा प्रोटोकॉल के साथ अपने कर्मचारियों का कौशल बढ़ाएं।" },
    "btn.start": { en: "Start Training Journey", hi: "प्रशिक्षण यात्रा शुरू करें" },
    "btn.video": { en: "Explore Modules", hi: "मॉड्यूल एक्सप्लोर करें" },
    "stat.compliance": { en: "Safety Compliance", hi: "सुरक्षा अनुपालन" },
    "stat.onboarding": { en: "Faster Onboarding", hi: "तेज़ ऑनबोर्डिंग" },
    "stat.ai": { en: "AI Assistance", hi: "एआई सहायता" },
    "mod.header.title": { en: "Advanced Learning Modules", hi: "उन्नत शिक्षण मॉड्यूल" },
    "mod.header.sub": { en: "Master complex chemical processes without real-world risks.", hi: "वास्तविक दुनिया के जोखिमों के बिना जटिल रासायनिक प्रक्रियाओं में महारत हासिल करें।" },
    "mod.1.title": { en: "Hazmat Protocols", hi: "हज़मैट प्रोटोकॉल" },
    "mod.1.desc": { en: "Interactive scenarios for hazardous material containment and handling.", hi: "खतरनाक सामग्री रोकथाम और हैंडलिंग के लिए इंटरएक्टिव परिदृश्य।" },
    "mod.2.title": { en: "Advanced Diagnostics", hi: "उन्नत डायग्नोस्टिक्स" },
    "mod.2.desc": { en: "AI-assisted machinery troubleshooting and predictive maintenance.", hi: "एआई-सहायक मशीनरी समस्या निवारण और भविष्य कहनेवाला रखरखाव।" },
    "mod.3.title": { en: "Process Control", hi: "प्रक्रिया नियंत्रण" },
    "mod.3.desc": { en: "Real-time simulation of plant control rooms and distributed control systems.", hi: "संयंत्र नियंत्रण कक्षों और वितरित नियंत्रण प्रणालियों का वास्तविक समय सिमुलेशन।" },
    "about.title": { en: "Real-Time Risk Monitoring", hi: "रीयल-टाइम जोखिम निगरानी" },
    "about.desc": { en: "Integrate your plant's data to generate AI-driven training models instantly. Karmasetu analyzes real-time sensor streams to create customized hazardous scenarios.", hi: "तुरंत एआई-संचालित प्रशिक्षण मॉडल तैयार करने के लिए अपने संयंत्र के डेटा को एकीकृत करें। कर्मसेतु अनुकूलित खतरनाक परिदृश्यों को बनाने के लिए वास्तविक समय सेंसर स्ट्रीम का विश्लेषण करता है।" },
    "about.li.1": { en: "Predictive Failure Training", hi: "प्रेडिक्टिव विफलता प्रशिक्षण" },
    "about.li.2": { en: "3D Digital Twin Integration", hi: "3डी डिजिटल ट्विन एकीकरण" },
    "about.li.3": { en: "Dynamic SCADA Simulation", hi: "डायनेमिक SCADA सिमुलेशन" },
    "dash.header": { en: "SYSTEM STATUS: OPTIMAL", hi: "सिस्टम स्थिति: इष्टतम" },
    "dash.core": { en: "Core Temperature", hi: "कोर तापमान" },
    "dash.pressure": { en: "Pressure Tolerance", hi: "दबाव सहनशीलता" },
    "dash.toxic": { en: "Toxicity Containment", hi: "विषाक्तता रोकथाम" },
    "footer.brand": { en: "Bridging the gap between humans and absolute plant safety.", hi: "मनुष्यों और पूर्ण संयंत्र सुरक्षा के बीच की खाई को पाटना।" },
    "footer.plat": { en: "Platform", hi: "मंच" },
    "footer.plat.1": { en: "Simulations", hi: "सिमुलेशन" },
    "footer.plat.2": { en: "Compliance", hi: "अनुपालन" },
    "footer.plat.3": { en: "Analytics", hi: "एनालिटिक्स" },
    "footer.comp": { en: "Company", hi: "कंपनी" },
    "footer.comp.1": { en: "About Us", hi: "हमारे बारे में" },
    "footer.comp.2": { en: "Careers", hi: "करियर" },
    "footer.comp.3": { en: "Contact", hi: "संपर्क" },
    "footer.copyright": { en: "© 2026 Karmasetu. All rights reserved.", hi: "© 2026 कर्मसेतु। सर्वाधिकार सुरक्षित।" },
    "modal.title": { en: "Select Portal Access", hi: "पोर्टल एक्सेस चुनें" },
    "modal.sub": { en: "Choose your identity to log in or create a new account.", hi: "लॉग इन करने या नया खाता बनाने के लिए अपनी पहचान चुनें।" },
    "modal.admin": { en: "Admin Portal", hi: "व्यवस्थापक पोर्टल" },
    "modal.admin.desc": { en: "Manage courses, users, and safety analytics.", hi: "पाठ्यक्रम, उपयोगकर्ता और सुरक्षा विश्लेषिकी प्रबंधित करें।" },
    "modal.trainee": { en: "Trainee Portal", hi: "प्रशिक्षु पोर्टल" },
    "modal.trainee.desc": { en: "Access 3D simulations and active training.", hi: "3D सिमुलेशन और सक्रिय प्रशिक्षण तक पहुंचें।" },
    "modal.action": { en: "Login / Sign Up →", hi: "लॉगिन / साइन अप →" }
};

class Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
    glow: number;
    width: number;
    height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.color = Math.random() > 0.5 ? '#00f3ff' : '#0051ff';
        this.glow = Math.random() * 10 + 5;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x > this.width) this.x = 0;
        if (this.x < 0) this.x = this.width;
        if (this.y > this.height) this.y = 0;
        if (this.y < 0) this.y = this.height;
    }
    
    draw(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        
        ctx.shadowBlur = this.glow;
        ctx.shadowColor = this.color;
        
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

export default function ModernLanding() {
    const [currentLang, setCurrentLang] = useState<'en' | 'hi'>('en');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number | null>(null);

    const t = (key: string) => translations[key]?.[currentLang] || key;

    // Particle Animation Effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        let particles: Particle[] = [];
        
        const initParticles = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            particles = [];
            const particleCount = Math.floor((width * height) / 12000);
            for(let i = 0; i < particleCount; i++) {
                particles.push(new Particle(width, height));
            }
        };

        initParticles();

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw(ctx);
                
                for (let j = i; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(0, 243, 255, ${0.1 - distance/1000})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            animFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => initParticles();
        window.addEventListener('resize', handleResize);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // 3D Tilt Effect and Scroll Anim Effect
    useEffect(() => {
        // Tilt effect
        const cards = document.querySelectorAll('.tilt-effect');
        cards.forEach(card => {
            const el = card as HTMLElement;
            const handleMouseMove = (e: Event) => {
                const mouseEvent = e as MouseEvent;
                const rect = el.getBoundingClientRect();
                const x = mouseEvent.clientX - rect.left - rect.width / 2;
                const y = mouseEvent.clientY - rect.top - rect.height / 2;
                
                const multiplier = 20;
                const xRotate = multiplier * ((x / rect.width) * 2);
                const yRotate = -multiplier * ((y / rect.height) * 2);
                
                el.style.transform = `perspective(1000px) rotateX(${yRotate}deg) rotateY(${xRotate}deg) scale3d(1.05, 1.05, 1.05)`;
            };
            const handleMouseLeave = () => {
                el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            };

            el.addEventListener('mousemove', handleMouseMove);
            el.addEventListener('mouseleave', handleMouseLeave);
        });

        // Scroll animations
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    entry.target.classList.remove('out-view-top', 'out-view-bottom');
                } else {
                    entry.target.classList.remove('in-view');
                    if (entry.boundingClientRect.top < 0) {
                        entry.target.classList.add('out-view-top');
                    } else {
                        entry.target.classList.add('out-view-bottom');
                    }
                }
            });
        }, observerOptions);

        const animElements = document.querySelectorAll('.scroll-anim, .scroll-anim-delayed, .scroll-box');
        animElements.forEach(el => observer.observe(el));

        return () => {
            observer.disconnect();
        };
    }, []);

    return (
        <div className="landing-wrapper">
            {/* Background elements */}
            <div className="bg-wrapper">
                <div className="bg-image-fallback" style={{ position: 'absolute', top: 0, left: 0, width: '110%', height: '110%', backgroundImage: "url('/assets/background.png')", backgroundSize: 'cover', backgroundPosition: 'center', animation: 'panBackground 30s infinite alternate ease-in-out' }}></div>
                <div className="overlay"></div>
            </div>
            
            <canvas id="particleCanvas" ref={canvasRef}></canvas>

            {/* Navigation */}
            <div className="navbar-wrapper">
                <nav className="navbar glass navbar-pill">
                    <div className="nav-content">
                        <Link href="#" className="brand">
                            <div className="brand-icon-wrapper">
                                <img src="/assets/logo.png" alt="Karmasetu Logo" className="logo-img" />
                            </div>
                            <span className="brand-text">{t('brand.text')}</span>
                        </Link>
                        <ul className="nav-links">
                            <li><Link href="#platform" className="nav-item"><span className="icon">💻</span> {t('nav.platform')}</Link></li>
                            <li><Link href="#modules" className="nav-item"><span className="icon">🧪</span> {t('nav.modules')}</Link></li>
                            <li><Link href="#about" className="nav-item"><span className="icon">🏢</span> {t('nav.about')}</Link></li>
                        </ul>
                        <div className="nav-actions" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                            <button onClick={() => setCurrentLang(currentLang === 'en' ? 'hi' : 'en')} className="btn lang-btn glass" title="Toggle Language">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
                                <span className="lang-text" style={{ marginLeft: '0.4rem' }}>{currentLang === 'en' ? 'EN' : 'HI'}</span>
                            </button>
                            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary glow-btn"><span style={{ marginRight: '0.5rem' }}>🔑</span> <span>{t('btn.login')}</span></button>
                        </div>
                    </div>
                </nav>
            </div>

            {/* Hero Section */}
            <section className="hero scroll-anim" id="platform">
                <div className="hero-content">
                    <div className="badge glow-text">{t('hero.badge')}</div>
                    <h1 className="hero-title" dangerouslySetInnerHTML={{ __html: t('hero.title') }}></h1>
                    <p className="hero-subtitle">{t('hero.subtitle')}</p>
                    <div className="hero-cta">
                        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary lg glow-btn">{t('btn.start')}</button>
                        <Link href="#modules" className="btn btn-secondary lg glass" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t('btn.video')}</Link>
                    </div>
                    
                    <div className="stats-container glass scroll-anim-delayed">
                        <div className="stat bento-stat">
                            <div className="stat-num glow-text">99.9%</div>
                            <div className="stat-label">{t('stat.compliance')}</div>
                        </div>
                        <div className="stat bento-stat">
                            <div className="stat-num glow-text">40%</div>
                            <div className="stat-label">{t('stat.onboarding')}</div>
                        </div>
                        <div className="stat bento-stat">
                            <div className="stat-num glow-text">24/7</div>
                            <div className="stat-label">{t('stat.ai')}</div>
                        </div>
                    </div>
                </div>
                
                <div className="hero-visual">
                    <div className="hologram-ring"></div>
                    <div className="hologram-ring outer"></div>
                    <div className="hologram-core"></div>
                </div>
            </section>

            {/* Brief Features Section */}
            <section id="modules" className="features">
                <div className="section-header scroll-anim">
                    <h2 className="glow-text">{t('mod.header.title')}</h2>
                    <p>{t('mod.header.sub')}</p>
                </div>
                <div className="feature-grid">
                    <div className="scroll-box" style={{ '--reveal-delay': '0.1s' } as React.CSSProperties}>
                        <div className="card-wrapper" style={{ animationDelay: '0s' }}>
                            <div className="feature-card glass tilt-effect">
                                <div className="icon glow" style={{ fontStyle: 'normal', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', background: 'rgba(0,243,255,0.1)', borderRadius: '50%', color: 'var(--primary-cyan)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                                </div>
                                <h3>{t('mod.1.title')}</h3>
                                <p>{t('mod.1.desc')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="scroll-box" style={{ '--reveal-delay': '0.3s' } as React.CSSProperties}>
                        <div className="card-wrapper" style={{ animationDelay: '1.5s' }}>
                            <div className="feature-card glass tilt-effect">
                                <div className="icon glow" style={{ fontStyle: 'normal', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', background: 'rgba(0,243,255,0.1)', borderRadius: '50%', color: 'var(--primary-cyan)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                                </div>
                                <h3>{t('mod.2.title')}</h3>
                                <p>{t('mod.2.desc')}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="scroll-box" style={{ '--reveal-delay': '0.5s' } as React.CSSProperties}>
                        <div className="card-wrapper" style={{ animationDelay: '3s' }}>
                            <div className="feature-card glass tilt-effect">
                                <div className="icon glow" style={{ fontStyle: 'normal', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', background: 'rgba(0,243,255,0.1)', borderRadius: '50%', color: 'var(--primary-cyan)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>
                                </div>
                                <h3>{t('mod.3.title')}</h3>
                                <p>{t('mod.3.desc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Platform Analytics Section */}
            <section className="analytics scroll-anim" id="about">
                <div className="analytics-content">
                    <h2 className="glow-text">{t('about.title')}</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '1rem', marginBottom: '2rem' }}>{t('about.desc')}</p>
                    <ul className="check-list modern-list">
                        <li><div className="list-icon-circle-glow">⚡</div> <span>{t('about.li.1')}</span></li>
                        <li><div className="list-icon-circle-glow">🌐</div> <span>{t('about.li.2')}</span></li>
                        <li><div className="list-icon-circle-glow">📊</div> <span>{t('about.li.3')}</span></li>
                    </ul>
                </div>
                <div className="analytics-visual scroll-box" style={{ '--reveal-delay': '0.2s' } as React.CSSProperties}>
                    <div className="hologram-dashboard glass tilt-effect">
                        <div className="dashboard-header glow-text">{t('dash.header')}</div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span>{t('dash.core')}</span> <span style={{ color: 'var(--primary-cyan)', fontWeight: 'bold' }}>40%</span>
                        </div>
                        <div className="dashboard-bar"></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span>{t('dash.pressure')}</span> <span style={{ color: 'var(--primary-blue)', fontWeight: 'bold' }}>60%</span>
                        </div>
                        <div className="dashboard-bar" style={{ width: '60%', background: 'var(--primary-blue)', boxShadow: '0 0 10px var(--primary-blue)' }}></div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            <span>{t('dash.toxic')}</span> <span style={{ color: '#a100ff', fontWeight: 'bold' }}>80%</span>
                        </div>
                        <div className="dashboard-bar" style={{ width: '80%', background: '#a100ff', boxShadow: '0 0 10px #a100ff' }}></div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="footer scroll-anim">
                <div className="footer-cta-wrapper">
                    <div className="footer-cta-card glass tilt-effect">
                        <div className="cta-card-content">
                            <h3 className="glow-text">Ready to transform your plant?</h3>
                            <p>Deploy our AI training simulation in less than 48 hours.</p>
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary lg glow-btn">Start Deployment</button>
                    </div>
                </div>

                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="brand-logotype">
                            <img src="/assets/logo.png" alt="Logo" className="footer-logo" />
                            <span className="brand-text">{t('brand.text')}</span>
                        </div>
                        <p style={{ marginTop: '1rem' }}>{t('footer.brand')}</p>
                        <div className="social-links">
                            <Link href="#" className="social-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                            </Link>
                            <Link href="#" className="social-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-2"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
                            </Link>
                            <Link href="#" className="social-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            </Link>
                        </div>
                    </div>
                    <div className="footer-links-group">
                        <div className="footer-links">
                            <h4>{t('footer.plat')}</h4>
                            <ul>
                                <li><Link href="#"><span className="list-icon">▸</span> <span>{t('footer.plat.1')}</span></Link></li>
                                <li><Link href="#"><span className="list-icon">▸</span> <span>{t('footer.plat.2')}</span></Link></li>
                                <li><Link href="#"><span className="list-icon">▸</span> <span>{t('footer.plat.3')}</span></Link></li>
                            </ul>
                        </div>
                        <div className="footer-links">
                            <h4>{t('footer.comp')}</h4>
                            <ul>
                                <li><Link href="#"><span className="list-icon">▸</span> <span>{t('footer.comp.1')}</span></Link></li>
                                <li><Link href="#"><span className="list-icon">▸</span> <span>{t('footer.comp.2')}</span></Link></li>
                                <li><Link href="#"><span className="list-icon">▸</span> <span>{t('footer.comp.3')}</span></Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p dangerouslySetInnerHTML={{ __html: t('footer.copyright') }}></p>
                </div>
            </footer>

            {/* Double Login Modal */}
            <div className={`modal-overlay ${isModalOpen ? '' : 'hidden'}`} onClick={(e) => {
                if (e.target === e.currentTarget) setIsModalOpen(false);
            }}>
                <div className="modal-content glass tilt-effect">
                    <button onClick={() => setIsModalOpen(false)} className="close-btn">&times;</button>
                    <h2 className="glow-text modal-title">{t('modal.title')}</h2>
                    <p className="modal-subtitle">{t('modal.sub')}</p>
                    <div className="login-options-grid">
                        <Link href="/admin" className="login-card outline-bento">
                            <div className="login-icon">🛡️</div>
                            <h3>{t('modal.admin')}</h3>
                            <p>{t('modal.admin.desc')}</p>
                            <div className="login-action-text glow-text" style={{ marginTop: '1.5rem', fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--primary-cyan)' }}>{t('modal.action')}</div>
                        </Link>
                        <Link href="/trainee" className="login-card outline-bento">
                            <div className="login-icon">👨‍🔬</div>
                            <h3>{t('modal.trainee')}</h3>
                            <p>{t('modal.trainee.desc')}</p>
                            <div className="login-action-text glow-text" style={{ marginTop: '1.5rem', fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--primary-cyan)' }}>{t('modal.action')}</div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
