import os
import re
import json

TEMPLATE_DIR = r'd:\PERSONAL\PROJECTS\03. Microservices\AudBear Techy\audbear_techy\templates\resume\template_html'
OUTPUT_FILE = r'd:\PERSONAL\PROJECTS\03. Microservices\AudBear Techy\audbear_techy\js\resume_js\resume_templates_data.js'

def clean_text(text):
    if not text: return ""
    # Remove HTML tags and extra whitespace
    text = re.sub(r'<[^>]+>', '', text)
    return " ".join(text.split()).strip()

def extract_data(html_content):
    data = {
        "name": "",
        "title": "",
        "summary": "",
        "email": "hello@audbear.com",
        "phone": "(123) 456-7890",
        "location": "Anytown, USA",
        "experience": [],
        "studyContent": [],
        "education": [], # Kept for safety during logic
        "skills": [],
        "projects": [],
        "languages": [],
        "achievements": [],
        "awards": []
    }

    # 1. Name & Title (usually in H1 and H3)
    name_match = re.search(r'<h1[^>]*>(.*?)</h1>', html_content, re.IGNORECASE | re.DOTALL)
    if name_match: data["name"] = clean_text(name_match.group(1))
    
    title_match = re.search(r'<h3[^>]*>(.*?)</h3>', html_content, re.IGNORECASE | re.DOTALL)
    if title_match: data["title"] = clean_text(title_match.group(1))

    # 2. Summary
    summary_match = re.search(r'<(?:p|div)[^>]*class="[^"]*(?:summary-text|gen-summary|profile-text|objective)[^"]*"[^>]*>(.*?)</(?:p|div)>', html_content, re.IGNORECASE | re.DOTALL)
    if not summary_match:
        # Fallback: look for section following "Summary" or "Profile"
        summary_match = re.search(r'h2[^>]*>(?:Summary|Profile).*?</h2>.*?<p[^>]*>(.*?)</p>', html_content, re.IGNORECASE | re.DOTALL)
    
    if summary_match: data["summary"] = clean_text(summary_match.group(1))

    # 3. Contact Info (Heuristic search)
    phone_match = re.search(r'[\(]?\d{3}[\)]?\s?\d{3}[\-\s]?\d{4}', html_content)
    if phone_match: data["phone"] = phone_match.group(0)
    
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', html_content)
    if email_match: data["email"] = email_match.group(0)

    # 4. Experience
    exp_section = re.search(r'(?:Employment History|Experience|Work History).*?</h2>(.*?)(?=<h2|</body>)', html_content, re.IGNORECASE | re.DOTALL)
    if exp_section:
        # Match items with <h4> (title/comp), <span class="meta"> (date/loc), and <ul> (bullets)
        items = re.findall(r'<h4>(.*?)</h4>.*?<span[^>]*class="meta"[^>]*>(.*?)</span>.*?<ul>(.*?)</ul>', exp_section.group(1), re.IGNORECASE | re.DOTALL)
        for itm in items:
            title_comp = clean_text(itm[0])
            bullets_html = itm[2]
            bullets = [clean_text(b) for b in re.findall(r'<li>(.*?)</li>', bullets_html, re.IGNORECASE | re.DOTALL)]
            
            comp = ""
            title = title_comp
            if "," in title_comp:
                parts = [x.strip() for x in title_comp.split(",")]
                title = parts[0]
                comp = ", ".join(parts[1:])
            elif "-" in title_comp:
                parts = [x.strip() for x in title_comp.split("-")]
                title = parts[0]
                comp = "- ".join(parts[1:])
            
            data["experience"].append({
                "title": title,
                "company": comp,
                "bullets": bullets
            })

    # 5. Education
    edu_section = re.search(r'Education.*?</h2>(.*?)(?=<h2|</body>)', html_content, re.IGNORECASE | re.DOTALL)
    if edu_section:
        items = re.findall(r'<h4>(.*?)</h4>.*?<span[^>]*class="meta"[^>]*>(.*?)</span>', edu_section.group(1), re.IGNORECASE | re.DOTALL)
        if not items:
            # Try Template 15 style: <h4>Master...</h4> <p>Uni<br>(Date)</p>
            items = re.findall(r'<h4>(.*?)</h4>\s*<p>(.*?)<br>(.*?)</p>', edu_section.group(1), re.IGNORECASE | re.DOTALL)
            for itm in items:
                data["studyContent"].append({
                    "degree": clean_text(itm[0]),
                    "school": clean_text(itm[1])
                })
        else:
            for itm in items:
                deg_school = clean_text(itm[0])
                school = ""
                degree = deg_school
                if "," in deg_school:
                    parts = [x.strip() for x in deg_school.split(",")]
                    school = parts[0]
                    degree = ", ".join(parts[1:])
                data["studyContent"].append({
                    "degree": degree,
                    "school": school
                })
    else:
        # Fallback if no education section but data exists in DEFAULT_DATA style
        data["studyContent"] = []

    # 6. Skills
    skills_match = re.search(r'Skills.*?</h2>(.*?)(?=<h2|</body>)', html_content, re.IGNORECASE | re.DOTALL)
    if skills_match:
        bullets = re.findall(r'<li>(.*?)</li>|<span[^>]*class="skill-name"[^>]*>(.*?)</span>', skills_match.group(1), re.IGNORECASE | re.DOTALL)
        for b in bullets:
            txt = clean_text(b[0] or b[1])
            if txt and txt not in data["skills"]: data["skills"].append(txt)

    # 7. Languages
    lang_match = re.search(r'Language.*?</h2>(.*?)(?=<h2|</body>)', html_content, re.IGNORECASE | re.DOTALL)
    if lang_match:
        bullets = re.findall(r'<li>(.*?)</li>', lang_match.group(1), re.IGNORECASE | re.DOTALL)
        for b in bullets:
            txt = clean_text(b)
            if txt:
                # Map to {name, level}
                name = txt
                level = "Native"
                if ":" in txt:
                    name, level = [x.strip() for x in txt.split(":", 1)]
                elif "(" in txt:
                    name = txt.split("(")[0].strip()
                    level = txt.split("(")[1].replace(")", "").strip()
                data["languages"].append({"name": name, "level": level})

    # 8. Awards -> achievements
    data["achievements"] = []
    award_match = re.search(r'(?:Awards|Achievements).*?</h2>(.*?)(?=<h2|</body>)', html_content, re.IGNORECASE | re.DOTALL)
    if award_match:
        bullets = re.findall(r'<li>(.*?)</li>|<h4>(.*?)</h4>', award_match.group(1), re.IGNORECASE | re.DOTALL)
        for b in bullets:
            txt = clean_text(b[0] or b[1])
            if txt: data["achievements"].append({"title": txt})

    # 9. Projects
    proj_match = re.search(r'Projects.*?</h2>(.*?)(?=<h2|</body>)', html_content, re.IGNORECASE | re.DOTALL)
    if proj_match:
        bullets = re.findall(r'<li>(.*?)</li>|<h4>(.*?)</h4>', proj_match.group(1), re.IGNORECASE | re.DOTALL)
        for b in bullets:
            txt = clean_text(b[0] or b[1])
            if txt: data["projects"].append({"name": txt})

    # Ensure studyContent is used instead of education key
    res = {
        "name": data["name"],
        "title": data["title"],
        "summary": data["summary"],
        "email": data["email"],
        "phone": data["phone"],
        "location": data["location"],
        "skills": data["skills"],
        "experience": data["experience"],
        "studyContent": data.get("studyContent", []),
        "languages": data["languages"],
        "projects": data["projects"],
        "achievements": data["achievements"]
    }
    return res

def main():
    all_data = {}
    for i in range(1, 64):
        filename = f'template_{i:02d}.html'
        filepath = os.path.join(TEMPLATE_DIR, filename)
        if os.path.exists(filepath):
            print(f"Analyzing {filename}...")
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                all_data[f"t{i}"] = extract_data(content)

    js_content = f"/**\n * Auto-generated Template Default Data\n */\nconst RESUME_TEMPLATE_DATA = {json.dumps(all_data, indent=2)};\n\nif (typeof window !== 'undefined') window.RESUME_TEMPLATE_DATA = RESUME_TEMPLATE_DATA;"
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"\nSuccessfully scanned 63 templates. Data saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
