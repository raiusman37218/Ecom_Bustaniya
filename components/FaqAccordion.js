"use client";

import { useState } from "react";
import { ChevronDown, MessageSquare, Truck, ShieldCheck, CreditCard, Sparkles } from "lucide-react";

const FAQ_SECTIONS = [
  {
    category: "Orders & Delivery",
    icon: Truck,
    items: [
      {
        question: "How long does delivery take across Pakistan?",
        answer: "Orders are verified and dispatched within 24 to 48 hours. Standard courier delivery takes 8 to 9 delivery days nationwide via our courier partner PostEx. You will receive SMS & WhatsApp tracking once your parcel is en route.",
      },
      {
        question: "How can I track my order status?",
        answer: "You can track your order at any time using our dedicated 'Track My Order' page with your Bustaniya Order Reference (e.g. BST-1042) or courier tracking number. You can also message our WhatsApp support team for live updates.",
      },
      {
        question: "What are the shipping charges?",
        answer: "Standard nationwide shipping charges are calculated during checkout. However, we offer 100% Free Nationwide Delivery on all Full Advance Payment (Bank Transfer) orders!",
      },
      {
        question: "Do you ship internationally?",
        answer: "Yes, we ship to the UK and select international destinations. Please visit our UK storefront or contact our WhatsApp support team for international orders and shipping quotations.",
      },
    ],
  },
  {
    category: "Payment Methods",
    icon: CreditCard,
    items: [
      {
        question: "What payment options are available?",
        answer: "We offer two safe payment methods:\n1. Cash on Delivery (COD) – Pay in cash to the rider upon parcel arrival.\n2. Full Advance Payment (Online Bank Transfer / Nayapay / Sadapay) – Transfer the total amount directly to our official bank account and enjoy Free Nationwide Shipping.",
      },
      {
        question: "How do I confirm an Advance Payment order?",
        answer: "Once you complete checkout selecting Advance Payment, our official bank account details and WhatsApp link will be displayed on screen. Simply share a quick screenshot of your payment receipt on WhatsApp with your Order ID for instant dispatch confirmation.",
      },
      {
        question: "Is Cash on Delivery available everywhere in Pakistan?",
        answer: "Yes! COD is supported in 1,200+ cities, towns, and tehsils across Pakistan serviced by PostEx.",
      },
    ],
  },
  {
    category: "Custom Dress & Sizing",
    icon: Sparkles,
    items: [
      {
        question: "How do I choose the correct size?",
        answer: "Every product page includes an interactive Size Chart modal with detailed measurements (Chest, Waist, Hip, Shirt Length, Sleeves, Shoulder) in both inches and centimeters. If you are between sizes, we recommend selecting the slightly larger size or opting for our Custom Made-to-Measure service.",
      },
      {
        question: "Can I get an outfit tailored to my custom body measurements?",
        answer: "Yes! Bustaniya specializes in custom made-to-measure tailoring. Visit our 'Custom Dress' page, upload any reference picture or design you love, specify your measurements, and our master tailors will stitch your dress to perfection.",
      },
      {
        question: "What fabrics does Bustaniya use?",
        answer: "We prioritize premium, pure eastern fabrics including Luxury Lawn, Pure Cotton, Cotton Net, Chiffon, Raw Silk, Organza, and Velvet depending on the seasonal collection.",
      },
    ],
  },
  {
    category: "Returns & Exchanges",
    icon: ShieldCheck,
    items: [
      {
        question: "What is your Return & Exchange policy?",
        answer: "We offer a customer-friendly 7-day exchange policy for size issues, defective items, or incorrect deliveries. The item must be unworn, unwashed, and in its original packaging with all tags attached.",
      },
      {
        question: "How do I initiate an exchange?",
        answer: "Simply message our WhatsApp support (+92 305 3530008) within 7 days of receiving your order with your Order ID and photo of the parcel. Our team will arrange a reverse pickup or guide you on the quick swap process.",
      },
      {
        question: "Can I return a custom-tailored dress?",
        answer: "Made-to-measure custom outfits stitched specifically to your personalized measurements are non-returnable unless there is a stitching defect or fabric issue caused by our workshop, in which case we offer complimentary alterations.",
      },
    ],
  },
];

export default function FaqAccordion({ whatsappNumber = "923053530008" }) {
  const [openIndex, setOpenIndex] = useState("0-0");

  function toggle(id) {
    setOpenIndex((prev) => (prev === id ? null : id));
  }

  return (
    <div className="faqAccordionWrapper">
      {FAQ_SECTIONS.map((section, sIdx) => {
        const IconComponent = section.icon;
        return (
          <div key={section.category} className="faqCategoryBlock">
            <div className="faqCategoryHeading">
              <div className="faqCategoryIcon">
                <IconComponent size={20} />
              </div>
              <h2>{section.category}</h2>
            </div>

            <div className="faqItemsList">
              {section.items.map((item, iIdx) => {
                const id = `${sIdx}-${iIdx}`;
                const isOpen = openIndex === id;

                return (
                  <div key={item.question} className={`faqItemCard ${isOpen ? "faqItemCard--open" : ""}`}>
                    <button
                      type="button"
                      className="faqQuestionButton"
                      onClick={() => toggle(id)}
                      aria-expanded={isOpen}
                    >
                      <span className="faqQuestionText">{item.question}</span>
                      <ChevronDown
                        size={18}
                        className={`faqChevron ${isOpen ? "faqChevron--rotated" : ""}`}
                      />
                    </button>
                    {isOpen && (
                      <div className="faqAnswerWrap">
                        <p>{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="faqHelpCallout">
        <MessageSquare size={24} className="calloutIcon" />
        <div>
          <h3>Still have questions?</h3>
          <p>Our customer support team is always ready to assist you on WhatsApp.</p>
        </div>
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Assalam-o-Alaikum Bustaniya! I have a question regarding my purchase.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="faqWhatsappBtn"
        >
          Chat with Support
        </a>
      </div>
    </div>
  );
}
