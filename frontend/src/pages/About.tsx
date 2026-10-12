import Secret from "../components/Secret";

export default function About() {
  return (
    <section className="prose letter about">
      <div className="letter-seal">CC</div>
      <p className="eyebrow">A Letter from the Head's Study</p>
      <h1>About Campus Customs</h1>
      <p className="drop-cap">
        Friends, every college at Yale keeps its own traditions: a courtyard where first snow is greeted with
        snowball fights, a dining hall with a portrait that seems to watch you eat, a song only its members know.
        Campus Customs, the house behind Yale Bulldog Blue, keeps the regalia of all of them. Everything we carry is
        officially licensed, and everything is meant to be worn, whether in the stands at The Game{" "}
        <Secret id="game" /> or on a quiet Sunday walk to Book Trader.
      </p>
      <h2>What We Keep</h2>
      <p>
        Hoodies for long nights in the stacks, crewnecks for the walk across Cross Campus, quarter-zips for the
        interview you are slightly nervous about, and tees for every rivalry under the autumn sky. You may browse by
        residential college, varsity sport, or graduate school. Somewhere among them is the piece with your name on it.
      </p>
      <h2>For the Whole Yale Family</h2>
      <p>
        We dress the proud parent, the grandparent who still hums "Boola Boola" <Secret id="boola" />, and the sibling
        who is already plotting their own application. For something truly one of a kind, ask after our custom pieces,
        such as alumni jackets. (Custom orders are final sale, as all good vows are.)
      </p>
      <h2>Our Guide</h2>
      <p>
        You will find Sir Handsome Dan, our bulldog shopping assistant, waiting in the corner of every page. He knows the
        whole collection by scent: every size, every colour, and what is left on the shelf. Click him and he will help
        you choose.
      </p>
      <h2>Find Us</h2>
      <p>
        57 Broadway, New Haven, CT 06511 <Secret id="societies" />
        <br />
        Order questions: orderdept@campuscustoms.com
      </p>
      <p className="signature">— From the Head's Study, with Lux et Veritas</p>
    </section>
  );
}
