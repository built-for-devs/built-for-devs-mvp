export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  author: string;
  publishedAt: string;
  ogImage?: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "how-developers-evaluate-your-software-product",
    title: "How Developers Evaluate Your Software Product",
    description:
      "Developers don't just adopt products\u2014they advocate for the ones that make building effortless. If your developer journey and experience is frictionless, intuitive, and lets them dive right in, they won't just use it\u2014they'll tell other developers about it.",
    author: "Tessa Kriesel",
    publishedAt: "2025-01-29",
    ogImage:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDE2fHxzb2Z0d2FyZXxlbnwwfHx8fDE3MzgxNjQzNjR8MA&ixlib=rb-4.0.3&q=80&w=2400",
    content: `Developers are looking at your API, SDK, platform, or tool because:

1. They have the pain point your product solves and found you while searching for solutions.
2. Another developer told them about your product.

It's almost always for one of these two reasons. Occasionally, developers learn about you through developer channels\u2014where devs spend time\u2014like conferences, events, forums, private group messages, etc. Still, it's far more likely another developer told them about you.

One could argue that some developers check out products after seeing them in the wild, like conferences, for example, but was it the booth just sitting there that created the intrigue, or was it the conversation they had at the booth with a developer? You understand my point.

## Developers Just Love Building

Whether we're talking about a CTO at an enterprise company or a mid-career engineer at a scrappy startup, they think the same way. One has just shifted to leadership and orchestrates the brick building more than actually placing the bricks. They have fundamentally different requirements, but they both love building stuff.

> They both want a self-serve product motion so they can evaluate your product in a single weekend coding session.

They both want to dive into a product and get a feel for it before they even consider it as an option. You're already winning if your product can do that over your competitors. Building with your product could be why a CTO gets to write some code or an engineer gets to celebrate with their team Monday morning, and that will bring them immense joy and resonate with them far more than a sales demo ever can.

## Turning a Developer's Love for Building Into Your Value Proposition

If you can provide developers with the journey and experience they desire when trying your product, you're far more likely to gain their acceptance and advocacy. Let's break down the journey a developer takes when considering your product.

**Discovery** is when a developer first stumbles upon your existence. Remember, they either found you because they were searching for you or because someone told them about you. If you're not getting new developers to your product, developers aren't talking about you, or you're not discoverable.

**Research** is exactly what they're doing when they land on your homepage and almost immediately head to your documentation, integrations, and pricing pages. They're quickly consuming every detail they possibly can about your product's solutions, including who and how other developers are using it.

Hint: They pretty much go straight to your docs.

Developers will most likely leave at this point, doing further external research, including asking about you within their trusted peer circle or channels.

*Hint: Engagement and nurture opportunities are incredibly important at this point in the journey, so you can authentically remind them to come back around and evaluate your product. An invite to office hours is a great way to do this!*

**Evaluate** takes place when the developer can sit down and try your product in their current solution or scenario. They want your product to fit into their existing workflow and stack, so SDK's and native integrations are key at this stage.

Some developers, especially in leadership, don't get the opportunity to scope out these solutions during their day-to-day. They might be evaluating your product during an evening or weekend coding session. If they find success, they'll report back to their team. If they don't, that's usually the end of that lead opportunity, and the developer moves on to another potential solution.

> Your developer journey and product experience needs to meet the needs of your target developers.

**Activation** is when a developer has decided to utilize your solution and is building the necessary elements to "push to production." It should be simple for them to do. If this takes days or weeks, you need to address the friction in your developer journey immediately.

For example, I tried PostHog the other day. It took me a matter of minutes, and I was seeing valuable data in my dashboard. I felt like a goddess for getting it implemented so quickly, but it wasn't me at all; I only had to copy and paste one snippet of code. It was PostHog's team that made it simple to get setup.

**Membership** is what happens when a developer gains value from your product. They're drinking the Kool-Aid of value because you've solved their problem, and they can successfully say, "I built that," no matter how easy it was for them to solve, they're still the superhero at work. These developers become your word-of-mouth marketing.

> When you provide a delightful developer experience, your developers sing your praises to other developers.

## Developer Self-Serve Readiness is the Key to Developer Success

If you understand your target audience deeply and the experience they desire because you know their current stack and workflow, you can craft a developer journey that converts your leads into advocates, sometimes overnight [if you're that good].

PostHog and I have only been besties for a couple weeks, but it happened "overnight," and they've already been included in two of my recent blog posts and mentioned in a live stream. This is what developers do. When we find products we love, we talk about them.`,
  },
  {
    slug: "how-a-developer-navigates-your-product-homepage",
    title: "How a Developer Navigates Your Product Website Homepage",
    description:
      "Developers quickly scan homepages for self-serve indicators, then head to docs to evaluate technical fit and integrations.",
    author: "Tessa Kriesel",
    publishedAt: "2025-01-27",
    ogImage:
      "https://images.unsplash.com/photo-1614790871804-fe037bdc1214?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDI5fHxkZXZlbG9wZXJ8ZW58MHx8fHwxNzM3OTMwMzMyfDA&ixlib=rb-4.0.3&q=80&w=2400",
    content: `When a developer lands on your developer product's homepage for the first time, they're looking for the immediate indicators that it's **for them**.

In a matter of a second or two I can identify if a SaaS product is for me, a developer. These are the things I look for:

1. GitHub is immediately identifiable
2. Docs is in the main navigation
3. Homepage hero messaging that makes it clear, like "How developers build successful products" *[from PostHog]*
4. None of the main navigation gives off an enterprise vibe, like "Solutions"
5. "Sign up" call-to-action vs "book a demo" or "book a call"

We're generally looking for all the indicators that tell us this product is self-serve and we don't need to "hop on a call" to gain access. Developers are looking to solve the problem that is blocking them right now, and move on.

## The Self-Serve Developer Journey

After the immediate navigation and homepage hero review, a developer will either leave, or dive a little deeper to learn more. Here's what they'll do next:

1. Quickly scroll the homepage to get a general understanding of what the product does
2. Review the documentation with fairly decent detail to validate or invalidate the impression they got from the homepage
3. Search for the integrations page to validate if the product already seamlessly connects to their pre-existing tool stack
4. Next, over to pricing to understand if the product is even an option for them
5. Now, things are a little bit less predictable, however, they're generally looking to build credibility and more deeply understand the product. They'll likely take one or all of the following steps next:
   - Read the blog, ideally looking to learn from the product and engineering team, as well as looking for how others use the product
   - Look for how other developers are getting support, is there a community? Are examples being shared somewhere?
   - Product pages and otherwise that further validate it meets their specific needs
   - Other pages and external links that build credibility around the product and company. They're trying to find developers who use it to learn how they're using it, and what problems it solved for them
6. Eventually signing up for the product, unless you ask for a credit card, then they'll go to the next product like yours

## Ideal Developer Website Main Navigation

If you're bringing together your marketing website and unsure what your main navigation should look like, I'd recommend something like this:

- Products
- Docs
- Pricing
- Blog
- Developers
- Enterprise *(if you have one)*

## Keep It Simple

Developers like it simple and they just want to build stuff. Make it easy for them to build stuff with your developer product\u2014from homepage to docs to production.`,
  },
  {
    slug: "best-questions-for-dev-tool-founders-to-ask-developers",
    title:
      "Best Questions for Developer Product Founders to Ask Their Users and Prospects",
    description:
      "Successful dev tool founders use these questions to understand their users to get real feedback that shapes product strategy, from finding product-market fit to knowing where to invest resources.",
    author: "Tessa Kriesel",
    publishedAt: "2024-11-11",
    content: `## Gathering Developer Feedback: How to Define Your Problem Fit

Early-stage dev tools face a critical challenge: reaching both curious developers who love testing new tools AND empowered developers with budgets. The key is having the right conversations.

Two essential developer conversation types are prospect interviews and customer interviews. Each requires a different approach to uncover insights that drive growth.

Talking to prospects and customers helps you understand problem fit and identify who needs your product.

## Prospect Interviews: Finding Your Market Opportunities

Schedule 10-20 interviews with developers in your target market. Your goal is validating that your dev tool solves a pressing problem they face. Here's what to ask:

1. **"If you could wave a magic wand and change anything about how you perform [the task your dev tool solves for], what would it be?"** \u2014 This opens conversation to blue-sky thinking without technical constraints.

2. **"How do you think it could change your life if it could do that?"** \u2014 Now you're validating actual impact, which is critical for understanding value.

3. **"What's different about the world now, such that what we just discussed is more valuable than it would have been five years ago?"** \u2014 This reveals market timing and urgency.

4. **"I spoke to a few dozen of your peers. They identified these [three items] as the most painful in your industry, do you agree?"** \u2014 Cross-reference pain points across interviews to spot patterns.

5. **"Do you have these problems in your organization?"** \u2014 Move from theoretical to concrete\u2014do they actually face this pain?

6. **"Are you committed to solving these problems in the future?"** \u2014 Gauge buying intent and prioritization.

Organize what you learn and look for trends. Keep interviewing prospects until you no longer have acquisition struggles.

## Customer Interviews: Understanding Your Success Stories

Your existing customers are a goldmine of insights about what's working. Book as many interviews as you can and ask:

1. **"What was your life like before you started using this dev tool?"** \u2014 Understand their starting point and initial pain.

2. **"What happened that made you realize 'this isn't working, I need something else.'"** \u2014 Identify the trigger moments that drive adoption.

3. **"What did you do next, and next, until you found our dev tool?"** \u2014 Map their discovery and evaluation journey.

4. **"What led you to choose our dev tool over others?"** \u2014 Understand your real differentiators.

5. **"What value did you experience that convinced you to pay for our solution?"** \u2014 Learn what actually drives purchasing decisions.

6. **"What can you do now that you couldn't do before?"** \u2014 Quantify your concrete impact.

7. **"What happened next\u2014how has your life been changed due to our dev tool?"** \u2014 Prove your unexpected ROI.

Keep interviewing customers until you no longer have acquisition struggles.

## Making These Conversations Count

- Always record or bring a note-taker so you can focus on the conversation
- Look for patterns across multiple interviews
- Send a kind thank you email afterward
- Ship swag if you can\u2014it builds goodwill

These developer conversations aren't just about product feedback\u2014they're the foundation for your entire dev tool strategy. From product roadmap to pricing, marketing to partnerships, every decision should be guided by deep understanding of your target developers' needs.

Remember: The best dev tools don't try to reach all developers\u2014they focus on specific pain points for specific developer personas. These conversations will help you find yours and build everything around their needs.`,
  },
  {
    slug: "jobs-to-be-done-and-dev-tools",
    title: "Jobs To Be Done and Dev Tools",
    description:
      "Developers are discerning and pragmatic; they simply don't engage with tools that fail to address a critical need in their workflow.",
    author: "Tessa Kriesel",
    publishedAt: "2024-09-13",
    ogImage:
      "https://images.unsplash.com/photo-1468971050039-be99497410af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDEwfHxqb2JzfGVufDB8fHx8MTcyNjI2NDYxMXww&ixlib=rb-4.0.3&q=80&w=2400",
    content: `Jobs to be Done (JTBD) is a framework for understanding customer needs and motivations. It focuses on the "job" a customer is trying to accomplish rather than on the customer's characteristics or the product itself. This approach shifts the emphasis from what customers buy to why they purchase.

## Key Concepts

- **The "Job"**: A job represents the progress a person aims to make in a specific circumstance. It's not about the product they're buying but the goal they're trying to achieve.
- **Functional, Emotional, and Social Dimensions**: Jobs encompass functional aspects (practical tasks), emotional aspects (desired feelings), and social aspects (how people want others to perceive them).
- **Circumstances and Desired Outcomes**: To accurately define a job, it's crucial to understand both the specific situation (circumstance) and what success looks like (desired outcome).

## The JTBD Statement

A typical JTBD statement follows this format:

> "When [circumstance], I want to [motivation], so I can [desired outcome]."

Example:

> "When troubleshooting a production issue, I want to instantly recreate the exact build environment so I can quickly identify and resolve the problem without guesswork."

## Why JTBD Matters

- **User-Centric Innovation**: By focusing on jobs, you can innovate in ways that truly matter to your users.
- **Better Positioning**: Understanding the job helps you communicate your value proposition more effectively.
- **Competitive Advantage**: Identifying underserved jobs can reveal opportunities for differentiation.
- **Product Development**: JTBD can guide feature prioritization and development decisions.

## Applying JTBD

- Identify the circumstances that trigger a need for your developer tool
- Understand the technical challenge your users are trying to solve with your tool
- Determine the functional, emotional, and social aspects of the job
- Define clear desired outcomes from the developer's perspective
- Use these insights to guide product development, messaging, marketing, and overall strategy

Customers don't simply purchase products; they "hire" them for specific jobs. Understanding these jobs is crucial for creating value and taking your developer tool to market.`,
  },
  {
    slug: "how-you-know-youre-ready-to-hire-a-developer-advocate",
    title: "How You Know You're Ready to Hire a Developer Advocate",
    description:
      "Bringing on a developer advocate without a clear strategy is like hiring a captain for a ship without a destination or a map.",
    author: "Tessa Kriesel",
    publishedAt: "2024-07-25",
    ogImage:
      "https://images.unsplash.com/photo-1629709303904-06d564f237d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDR8fEZvciUyMGhpcmV8ZW58MHx8fHwxNzIxOTE3MTkxfDA&ixlib=rb-4.0.3&q=80&w=2400",
    content: `Developer Relations (DevRel) can significantly impact a company's success with developer products, driving adoption, community loyalty, and innovation. However, effective DevRel requires strategic planning before hiring.

> "Bringing on a developer advocate without a clear strategy is like hiring a captain for a ship without a destination or a map."

## Strategic Foundation Required

Organizations must establish a comprehensive developer strategy before posting job listings. This should include understanding target audiences, mapping the developer journey, and aligning initiatives with business objectives.

A strong Developer Relations program can dramatically accelerate product adoption, foster a vibrant and loyal community, and drive innovation through real-world feedback.

## Essential Strategy Components

A complete DevRel strategy should define:

- **Business Goals**: Specific user acquisition and retention targets
- **Target Personas**: Detailed developer segments with distinct needs
- **Developer Journey**: Stages from discovery through scale
- **KPIs**: Measurable success metrics including user retention and revenue influence
- **Content Strategy**: Publication schedules and distribution channels
- **Community Building**: Forums, programs, and engagement initiatives
- **Events & Sponsorships**: Conference presence and hosted experiences
- **Team Structure**: Roles and resource allocation
- **Timeline**: Phased implementation roadmap

## Before Hiring

Organizations should establish clear feedback mechanisms, define community participation expectations, and allocate appropriate budget. The resource includes a complete template demonstrating these elements through a fictional company example, CodeSync.

Proper preparation ensures newly hired advocates can "hit the ground running" with role clarity and strategic direction.`,
  },
  {
    slug: "when-to-hire-devrel",
    title: "When to Hire DevRel: The Million-Dollar Question",
    description:
      "When should you bring DevRel into your organization? TLDR: They should co-lead your product beta program.",
    author: "Tessa Kriesel",
    publishedAt: "2024-07-21",
    ogImage:
      "https://images.unsplash.com/photo-1493934558415-9d19f0b2b4d2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wxMTc3M3wwfDF8c2VhcmNofDE0fHx3aGVuJTIwYW5kJTIwd2hlcmUlMjBjbG9jayUyMGNhbGVuZGFyfGVufDB8fHx8MTcyMTY1NzI3Mnww&ixlib=rb-4.0.3&q=80&w=2000",
    content: `## Setting the Stage for Success

Developer Relations has become a crucial function in technology companies, serving as a bridge between your product and the developer community. The DevRel role extends beyond simple advocacy\u2014it focuses on building, nurturing, and sustaining relationships that encourage product adoption and drive innovation. Coordinating DevRel with product and marketing teams can substantially improve your product's marketability and usability.

Bringing DevRel into the organization early can prove transformative. By integrating DevRel into your product development process, you ensure that developers' perspectives inform product decisions, resulting in a product that aligns with your target audience's needs. The collaboration between DevRel, product, and marketing teams creates a unified strategy that accelerates growth and cultivates a committed developer community.

## Why Hire DevRel Before Your Product Beta?

Introducing DevRel before beta launch represents a strategic decision. Early involvement enables DevRel to lead the beta phase alongside the product team, guaranteeing that developer insights shape product development. Establishing relationships with developers early provides critical feedback that enhances your product's quality and market appeal.

DevRel's contribution to gathering feedback during the beta phase is invaluable. This input reveals pain points, clarifies user requirements, and guides product adjustments. Early developer participation also establishes the foundation for a robust community that will advocate for your product after public launch.

## Key Activities During the Beta Phase

During beta, DevRel concentrates on collecting early feedback, shaping the product roadmap, and encouraging innovation through developer input. Early feedback programs help pinpoint improvement opportunities and confirm the product meets developer expectations. These initiatives give developers a voice in the product's progression.

Product roadmap reviews involving Product and DevRel teams yield important perspectives on planned improvements. Engaging developers in these discussions helps guarantee your product develops according to their needs. Building an early adopters program addressing specific pain points cultivates exclusivity and loyalty, inspiring initial users to become long-term product champions.

## Building a Developer Community

A successful developer community demonstrates effective DevRel efforts. Creating genuine enthusiasm for your product represents the foundation of community growth. This requires solving developer challenges and supplying the tools and resources necessary for their success.

Maintaining active communication within the developer community is vital. Consistent engagement through forums, social platforms, and events keeps developers interested and committed. Cultivating enthusiastic advocates who willingly share their experiences extends your market reach and influence.

## Preparing for Public Launch

Before launch, providing early adopters with essential resources is critical. These materials\u2014including documentation, guides, and support options\u2014enable them to effectively use and promote your product. This preparation ensures early adopters have the knowledge to champion your product.

Growing through community support complements developer advocacy efforts. Tapping into your developer community's enthusiasm generates sustainable, organic growth. DevRel plays a central role, maintaining community engagement throughout the product's lifecycle.

## Maximizing Your Investment in DevRel

DevRel's value extends well beyond launch. Continuous community engagement by DevRel teams sustains long-term adoption and community growth. Maintaining active participation and responding to developer feedback enables continuous improvement and innovation.

Long-term community development creates loyalty and belonging among developers. DevRel's commitment to community cultivation produces a dedicated user base that both uses and recommends your product. Ongoing product enhancements driven by community feedback keep your product competitive and relevant in the marketplace.`,
  },
];

export function getAllPosts(): BlogPost[] {
  return blogPosts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
