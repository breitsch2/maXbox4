unit NeuralNetwork_mX4_onwork_12_GUI_Sample_64;
interface
//First Developed in 1999 B. Gültekin Çetiner
//Slight changes made in 2023 B. Gültekin Çetiner
//adapt to maXbox4 by Max , July 2023
//https://github.com/drcetiner/TNeuralNetwork/blob/main/NeuralNetwork.pas
//https://github.com/breitsch2/TNeuralNetwork

{Uses
Windows,SysUtils,Types, Classes,Vcl.StdCtrls,Vcl.Graphics,Vcl.Controls,Vcl.ExtCtrls,vcl.Dialogs,
  ShellAPI, Messages,
  IniFiles;   }

Type

                  NWFH=record
                   CR:string; //[84];
                   KTMNSYS:byte;
                   KTMNLR:string; //[19];
                   OO:double;
                   MO:double;
                   NTR:Longint;
                   TRDT:TDateTime;
                  end;
NWWT=record
       Value:Double;
     end;


  //TNeuralNetwork = class(TImage)
  //private
    { Private declarations }
   var 
    FNetHeader:NWFH;
    FWeightsinFile:NWWT;
    FClsblr:Boolean;
    FNumberOfTraining:Longint;
    FLearningRate : double;
    FMomentumRate : double;
    FRMSError : double;
    FNetwork : TStringList;
    ro : array of array of double;
    RoBias:array of array of double;
    BiasChange:array of array of double;
    MinimumInputs : array of double;
    MaximumInputs : array of double;
    MinimumOutputs : array of double;
    MaximumOutputs : array of double;
    Desired : array of double;
    aDifference : array of double;
    Neurons : array of array of double;
    FWeights : array of array of array of double;
    WeightChange : array of array of array of double;
    Biases : array of array of double;
    FInputNumber:integer;
    FOutputNumber:integer;
    FLayersNumber:integer;
    FInitialized:boolean;
    FErrorCodes:integer;
    FNeuronWidth:integer;
       Procedure RefreshNetworkImage;
       Procedure Dimensionalize;
       procedure SetNeuronsinLayers(value:tstringlist);
       Procedure ForwardProcessing;
       function ScaledValue(Value,Min,Max:double):double;
  //protected
    { Protected declarations }
 // public
    { Public declarations }
    procedure {constructor} createNetwork (AOWner : TComponent); //override;
    procedure {destructor} destroyNetwork; //override;
    Procedure Train;
    Procedure SetInputs(const Inputs : array of double);
    Procedure SetExpectedOutputs(const Outputs: array of double);
    Procedure GetOutputs(Var Outputs: array of double);
    Procedure Initialize(Randomized:Boolean);
    Procedure GetOutputsFromInputs(const Inputs : array of double; var Outputs : array of double);
    Procedure Recall;
    Procedure SetInputMinimums(const InputMinimums : array of double);
    Procedure SetInputMaximums(const InputMaximums : array of double);
    Procedure SetOutputMinimums(const OutputMinimums : array of double);
    Procedure SetOutputMaximums(const OutputMaximums : array of double);
    Procedure SetAllOutputRange(Minimum,Maximum:double);
    Procedure SetAllInputRange(Minimum,Maximum:double);
    Procedure DrawNetwork;
    Function LoadNetwork(FileName:string):Boolean;
    Function SaveNetwork(FileName:string):Boolean;
  //published
    { Published declarations }
    var LearningRate : double; // read FLearningRate write FLearningRate;
     MomentumRate : double; //read FMomentumRate write FMomentumRate;
     nNetwork:TStringList; //&&read FNetwork write SetNeuronsinLayers;
     NumberOfInputs:integer; //read FInputNumber;
     NumberOfOutputs:integer; //read FOutputNumber;
     NumberOfLayers:integer; //7/read FLayersNumber;
     Initialized:boolean; //read FInitialized;
     RMSError:double; //read; FRMSError;
     NeuronWidth:integer; //read; FNeuronWidth write FNeuronWidth;
     NumberOfTraining:longint; //read FNumberOfTraining;
//end;

 type
   TXORSample = {class(}TForm;
   var
   LearnBtn: TBitBtn;
   Input1: TEdit;
   Input2: TEdit;
   Output1: TEdit;
   nn2: TNeuralNetwork;
   RMSedit: TEdit;
   RMSImage: TImage;
   SpinEdit1: TSpinEdit;
   Panel1: TPanel;
   MessageBox: TMemo;
   Panel2: TPanel;
   Label1: TLabel;
   Label2: TLabel;
   Label3: TLabel;
   Label4: TLabel;
   Label5: TLabel;
   Label6: TLabel;
   Label7: TLabel;
   DrawNetBtn: TBitBtn;
   CalculateBtn: TBitBtn;
   SaveNetBtn: TBitBtn;
   LoadNetBtn: TBitBtn;
   Button1: TButton;
   StopLearnBtn: TBitBtn;
   OpenDialog1: TOpenDialog;
   SaveDialog1: TSaveDialog;
   TrainTimesEdt: TEdit;
   SaveNetBmpBtn: TBitBtn;
   procedure LearnBtnClick(Sender: TObject);
   procedure SpinEdit1Change(Sender: TObject);
   procedure DrawNetBtnClick(Sender: TObject);
   procedure CalculateBtnClick(Sender: TObject);
   procedure SaveNetBtnClick(Sender: TObject);
   procedure LoadNetBtnClick(Sender: TObject);
   procedure Button1Click(Sender: TObject);
   procedure StopLearnBtnClick(Sender: TObject);
   procedure FormCreate2(Sender: TObject);
   procedure SaveNetBmpBtnClick(Sender: TObject);
   //private
   { Private declarations }
   //public
   { Public declarations }
   //end;
   
 var
   XORSample: TXORSample;
   aContinue:boolean;
   form2: TForm;

procedure aRegister;

implementation

procedure aRegister;
begin
  //RegisterComponents('Additional', [TNeuralNetwork]);
end;

{ TNeuralNetwork }

procedure SetNeuronsinLayers(Value: TStringList);
begin
  FNetwork.Assign(Value);
end;
{
procedure TNeuralNetwork.SetLogs(Value: TStringList);
begin
  Flogs.Assign(Value);
end;
}

function ScaledValue(Value,Min,Max:double):double;
begin
     if (Max-Min)=0 then begin
        Result:=Value;
     end
     else Result:=(Value-min)/(Max-Min);
end;

procedure Dimensionalize;
var
  i, j : integer;
begin        {***** SET MATRIX SIZES *****}
Try
  //FNumberOfTraining:=0;
  
  FLayersNumber:=FNetwork.Count;
  FInputNumber:=StrToInt(FNetwork[0]);
  FOutputNumber:=StrToInt(FNetwork[FLayersNumber-1]);
  FInitialized:=true;
  writ('debug inf: finitalized = true')

  SetLength(Neurons,FNetwork.Count);
  SetLength(ro,FNetwork.Count);
  for i:=0 to High(Neurons) do begin
    SetLength(Neurons[i],StrToInt(FNetwork.Strings[i]));
    SetLength(ro[i],StrToInt(FNetwork.Strings[i]));
  end;

  SetLength(Biases,FNetwork.Count-1);
  SetLength(BiasChange,FNetwork.Count-1);
  for i:=0 to High(Biases) do begin
    SetLength(Biases[i],StrToInt(FNetwork.Strings[i+1]));
    SetLength(BiasChange[i],StrToInt(FNetwork.Strings[i+1]));
  end;

  SetLength(FWeights,FNetwork.Count-1);
  SetLength(WeightChange,FNetwork.Count-1);
  for i:=0 to High(FWeights) do begin
    SetLength(FWeights[i],StrToInt(FNetwork.Strings[i]));
    SetLength(WeightChange[i],StrToInt(FNetwork.Strings[i]));
    for j:=0 to High(FWeights[i]) do begin
      SetLength(FWeights[i][j],StrToInt(FNetwork.Strings[i+1]));
      SetLength(WeightChange[i][j],StrToInt(FNetwork.Strings[i+1]));
    end;
  end;
  SetLength(Desired,StrToInt(FNetwork.Strings[fnetwork.Count-1]));
  SetLength(aDifference,StrToInt(FNetwork.Strings[fnetwork.Count-1]));

  SetLength(MinimumInputs,StrToInt(FNetwork.Strings[0]));
  SetLength(MaximumInputs,StrToInt(FNetwork.Strings[0]));

  SetLength(MinimumOutputs,StrToInt(FNetwork.Strings[fnetwork.Count-1]));
  SetLength(MaximumOutputs,StrToInt(FNetwork.Strings[fnetwork.Count-1]));
  writeln('debug inf dimension called');
Except {on EStringListError do raise} Exception.Create('Error in Network Structure');
end; //Except

end;

procedure createNetwork(AOWner: TComponent);
begin
  //inherited create(AOwner);

  FClsblr:=true;
  nNetwork:=TStringList.Create;
  FNetwork:= nNetwork;
  FInitialized:=false;
  FLearningRate :=0.9;
  FMomentumRate :=0.39;
  //Width := 120;
  //Height :=120;
  FNeuronWidth:=15;
  FRMSError:=1;
  FNumberOfTraining:=1;
end;

procedure createNetwork2(AOWner: TComponent);
begin
  //inherited create(AOwner);
  FClsblr:=true;
  nNetwork:=TStringList.Create;
  FNetwork:= nNetwork;
  FInitialized:=false;
  FLearningRate :=0.900000000000000000;
  FMomentumRate :=0.390000000000000000;
  nNetwork.Clear; // Clear network structure
    nNetwork.Add('2'); // Number of inputs
    nNetwork.Add('3'); // Number of hidden neurons
    nNetwork.Add('2'); // Number of hidden neurons
    nNetwork.Add('1'); // Number of outputs
  //Width := 120;
  //Height :=120;
  FNeuronWidth:=30;
  FRMSError:=1;
  FNumberOfTraining:=1;
end;

procedure {destructor} destroyNetwork;
begin
  nNetwork.Free;
  //inherited;
end; //}

procedure Train;
var i, j, k : integer; TotalRo,TotalRoBias : double;
begin
  Recall;
  FNumberOfTraining:=FNumberOfTraining+1;
  FRMSError:=0;
  for i:=0 to high(Desired) do begin
    aDifference[i]:=Desired[i]-Neurons[high(Neurons)][i];
    FRMSError:=FRMSError+sqr(aDifference[i]);
  end;
  FRMSError:=FRMSError/2;
  {***** ro for output *****}
  i:=high(Neurons);
  for j:=0 to high(aDifference) do begin
    ro[i][j]:=(1-Neurons[i][j])*Neurons[i][j]*aDifference[j];
  end;

  {***** ro for other layers *****}
  for i:=high(Neurons)-1 downto 1 do
    for j:=0 to high(Neurons[i]) do begin
      TotalRo := 0;
      for k:=0 to high(Neurons[i+1]) do begin
        TotalRo:=TotalRo+ro[i+1][k]*FWeights[i][j][k];
      end;
      ro[i][j]:=(1-Neurons[i][j])*Neurons[i][j]*TotalRo;
    end;
  {***** change for output weight *****}
  for i:=high(Neurons)-1 downto 0 do
    for j:=0 to high(Neurons[i]) do 
      for k:=0 to high(Neurons[i+1]) do begin
        WeightChange[i][j][k]:=FLearningRate*ro[i+1][k]*Neurons[i][j]+
                                   FMomentumRate*WeightChange[i][j][k];
        FWeights[i][j][k]:=FWeights[i][j][k]+WeightChange[i][j][k];
      end;
end;

procedure ForwardProcessing;
var
  i,j,k:integer;
  NetWeight : double;
begin
  for i:=1 to high(Neurons) do
    for j:=0 to high(Neurons[i]) do begin
      NetWeight := 0;
      for k:=0 to high(Neurons[i-1]) do begin
        NetWeight:= NetWeight + Neurons[i-1][k] * FWeights[i-1][k][j];
      end;
      Neurons[i][j]:=1/(1+exp(-NetWeight-Biases[i-1][j]));
    end;

    {
for i:=0 to High(FWeights) do
  for j:=0 to High(FWeights[i]) do
      for k:=0 to High(FWeights[i,j]) do
           Flogs.Add('New FWeights['+IntTostr(i)+','+IntTostr(j)+','+ IntTostr(k)+')='+FloatTostr(FWeights[i,j,k]));

  for i:=0 to High(Biases) do
    for j:=0 to High(Biases[i]) do
      Flogs.Add('New Bias('+IntTostr(i)+','+IntTostr(j)+')='+FloatTostr(Biases[i,j]));
     }
end;

Procedure Recall;
Begin
    ForwardProcessing;
end;

procedure Initialize(Randomized:Boolean);
var
  i,j,k:integer;
begin
  FNumberOfTraining:=0;
  Dimensionalize;
  writ('dimesionalize called');
  if Randomized then Randomize;
  {***** Giving random values to FWeights and biases *****}
  for i:=0 to High(FWeights) do
    for j:=0 to High(FWeights[i]) do
      for k:=0 to High(FWeights[i][j]) do begin
           FWeights[i][j][k]:=random(4);
        end;
  for i:=0 to High(Biases) do
    for j:=0 to High(Biases[i]) do begin
      Biases[i][j]:=random(4);
    end;
end;

Function {TNeuralNetwork.}LoadNetwork(FileName:string):Boolean;
Var
   Successfull:boolean;   F:TextFile;
   i,j,k:integer;         FirstLine:string;
   NwCount,Katman:integer;      Res1,Res2:integer;
   Dosya1:File; //of NWFH;
   Dosya2:File; //of NWWT;
   ExtKonum:integer;
begin
if not FClsblr then begin
     result:= false;
     ShowMessage('You can load network if you are registered')
end else begin
  Try
   Successfull:=true;
   FileName:=AnsiUpperCase(FileName); AssignFile(Dosya1,FileName);
   ExtKonum:=pos('.NET',FileName); delete(FileName,ExtKonum,4);
   AssignFile(Dosya2,FileName+'.dat');
   //{$I-} Reset(Dosya1); {$I+} Res1:=IOResult;
   //{$I-} Reset(Dosya2); {$I+} Res2:=IOResult;
   if Res1<>0 then begin
         Successfull:=false;
         raise exception.Create('Error in opening Network Definition file');
   end
   else if Res2<>0 then begin
         Successfull:=false;
         raise exception.Create('Error in opening Network data file');
   end
   else begin
        FNetwork.Clear;
        // File Format
        //Read(Dosya1,FNetHeader); //Read(Dosya1,FirstLine);
        FLayersNumber:=FNetHeader.KTMNSYS;
        FLearningRate:=FNetHeader.OO;
        FMomentumRate:=FNetHeader.MO;
        FNumberOfTraining:=FNetHeader.NTR;
      	NwCount:=FNetHeader.KTMNSYS;
        for i:=0 to NwCount-1 do begin
            Katman:=Ord(FNetHeader.KTMNLR[i+1]);
            FNetwork.Add(IntToStr(Katman));
        end;
        FNetwork:=FNetwork;
        closefile(Dosya1);
        Dimensionalize;

        for i:=0 to High(FWeights) do
           for j:=0 to High(FWeights[i]) do
              for k:=0 to High(FWeights[i][j]) do begin
                   //Read(Dosya2,FWeightsinFile);
                   FWeights[i][j][k]:=FWeightsinFile.Value;
              end;

        for i:=0 to High(Biases) do
           for j:=0 to High(Biases[i]) do begin
                //Read(Dosya2,FWeightsinFile);
	      	Biases[i][j]:=FWeightsinFile.Value;
           end;

        for i:=0 to High(Neurons[0]) do //All inputs range
        begin
	    //Read(dosya2,FWeightsinFile);
            MinimumInputs[i]:=FWeightsinFile.Value;
	    //Read(dosya2,FWeightsinFile);
            MaximumInputs[i]:=FWeightsinFile.Value;
        end;
        for i:=0 to High(Desired) do begin
	    //Read(dosya2,FWeightsinFile);
	    MinimumOutputs[i]:=FWeightsinFile.Value;
	    //Read(dosya2,FWeightsinFile);
	    MaximumOutputs[i]:=FWeightsinFile.Value;
      end;
     closefile(Dosya2);
   end;
   result:= Successfull;
except
  //on E: Exception do
         begin
            if not ((Res1<>0) or (Res2<>0)) then
               xraise (Exception.Create('Unrecognized File'));
         end;
   end;
 end;
end;

Function SaveNetwork(FileName:string):Boolean;
Var
   Successfull:boolean;
   F:TextFile;
   i,j,k:integer;
   Dosya1:File; //of NWFH;
   Dosya2:File; //of NWWT;
   ExtKonum:integer;
begin
if not FClsblr then begin
     result:= false;
     ShowMessage('You can save network if you are registered')
end
else begin
Successfull:=true;
   FileName:=AnsiUpperCase(FileName); AssignFile(Dosya1,FileName);
   ExtKonum:=pos('.NET',FileName); delete(FileName,ExtKonum,4);
   AssignFile(Dosya2,FileName+'.dat');
  //{$I-}
   Rewrite(Dosya1); Rewrite(Dosya2);
   //{$I+}
   if IOResult<>0 then Successfull:=false
   else begin
        // File Saving Format
        FNetHeader.KTMNSYS:=FNetwork.Count;
        FNetHeader.OO:=FLearningRate;
        FNetHeader.MO:=FMomentumRate;
        FNetHeader.NTR:=FNumberOfTraining;
        FNetHeader.TRDT:=Now;
        FNetHeader.KTMNLR:='';
        for i:=0 to FNetwork.Count-1 do
                   FNetHeader.KTMNLR:=FNetHeader.KTMNLR+Chr(StrToInt(FNetwork[i]));

        //Write(Dosya1,FNetHeader); closefile(Dosya1);
        for i:=0 to High(FWeights) do
           for j:=0 to High(FWeights[i]) do
              for k:=0 to High(FWeights[i][j]) do begin
                   FWeightsinFile.Value:=FWeights[i][j][k];
                  //Write(Dosya2,FWeightsinFile);
              end;

        for i:=0 to High(Biases) do
           for j:=0 to High(Biases[i]) do begin
               FWeightsinFile.Value:=Biases[i][j];
               //Write(Dosya2,FWeightsinFile);
           end;

        for i:=0 to High(Neurons[0]) do //All inputs range
        begin
            FWeightsinFile.Value:=MinimumInputs[i];
            //Write(Dosya2,FWeightsinFile);
            FWeightsinFile.Value:=MaximumInputs[i];
            //Write(Dosya2,FWeightsinFile);
        end;
        for i:=0 to High(Desired) do begin
             FWeightsinFile.Value:=MinimumOutputs[i];
             //Write(Dosya2,FWeightsinFile);
             FWeightsinFile.Value:=MaximumOutputs[i];
             //Write(Dosya2,FWeightsinFile);
        end;
      closefile(Dosya2);
   end;
   result:= Successfull;
end;
end;

var aimg: TImage;  Form1: TForm;

Procedure RefreshNetworkImage;
Var
   i,j,k:integer;
   Sol,Sag,Ust,Alt,GridX,GridY:integer;
   HucreSayisi:integer;
   str1:string;
   X1,X2,Y1,Y2:integer;
   KoordX,KoordY:array of array of integer;
   Altmi:boolean;

Begin
    if not FInitialized then begin
        raise Exception.Create('First, you have to Initialize the Network');
        exit;
    end;

    //form1.getclientrect
    Sol:=form1.Left; Sag:=form1.Clientwidth-10;
    //Ust:=aimg.ClientRect.Top; Alt:=ClientRect.Bottom;
     Ust:=form1.Top; Alt:=form1.Clientheight-10;
    aimg.Canvas.pen.Color:=clBlack;
    aimg.Canvas.Rectangle(Sol,Ust,Sag,Alt);

    GridY:=Trunc((Alt-Ust) / nNetwork.Count);
    SetLength(KoordX,nNetwork.Count); SetLength(KoordY,nNetwork.Count);
    writeln('debug inf nncount:'+itoa(nnetwork.count));

    for i:=1 to nNetwork.Count do begin
        HucreSayisi:=StrToInt(nNetwork[i-1]);
        GridX:=Trunc((Sag-Sol)/HucreSayisi);
        SetLength(KoordX[i-1],HucreSayisi); SetLength(KoordY[i-1],HucreSayisi);
        for j:=0 to StrToInt(nNetwork[i-1])-1 do begin
            X1:=GridX div 2+GridX*(j)-FNeuronWidth; Y1:=GridY*i-FNeuronWidth-GridY div 2;
            X2:=GridX div 2+GridX*(j)+FNeuronWidth; Y2:=GridY*i+FNeuronWidth-GridY div 2;
            KoordX[i-1][j]:=X1+(X2-X1) div 2;
            KoordY[i-1][j]:=Y1+(Y2-Y1) div 2;
        end;
    end;

    for i:=0 to nNetwork.Count-2 do
      for j:=0 to StrToInt(nNetwork[i])-1 do
           for k:=0 to StrToInt(nNetwork[i+1])-1 do begin
               aimg.Canvas.pen.Color:= clSilver; //RGB(random(255),random(255),random(255));
               aimg.Canvas.pen.Width:=1;
               aimg.Canvas.MoveTo(KoordX[i][j],KoordY[i][j]);
               aimg.Canvas.LineTo(KoordX[i+1][k],KoordY[i+1][k]);
           end;
    for i:=1 to nNetwork.Count do
        for j:=0 to StrToInt(nNetwork[i-1])-1 do begin
           aimg.Canvas.brush.Color:=clNavy; //RGB(random(255),random(255),random(255));
           aimg.Canvas.ellipse(KoordX[i-1][j]-FNeuronWidth,KoordY[i-1][j]-FNeuronWidth,KoordX[i-1][j]
                                             +FNeuronWidth,KoordY[i-1][j]+FNeuronWidth);
        end;

   for i:=0 to StrToInt(nNetwork[0])-1 do begin
        aimg.Canvas.pen.Color:=clRed;
        aimg.Canvas.pen.Width:=1;
        aimg.Canvas.MoveTo(KoordX[0][i],KoordY[0][i]-FNeuronWidth*3);
        aimg.Canvas.LineTo(KoordX[0][i],KoordY[0][i]-FNeuronWidth);
        aimg.Canvas.moveTo(KoordX[0][i],KoordY[0][i]-FNeuronWidth); // ok sað ucu
        aimg.Canvas.LineTo(KoordX[0][i]+FNeuronWidth,KoordY[0][i]-FNeuronWidth*2);
        aimg.Canvas.moveTo(KoordX[0][i],KoordY[0][i]-FNeuronWidth); // ok sol ucu
        aimg.Canvas.LineTo(KoordX[0][i]-FNeuronWidth,KoordY[0][i]-FNeuronWidth*2);
   end;
   j:=nNetwork.count-1;
   for i:=0 to StrToInt(nNetwork[nNetwork.count-1])-1 do begin
        aimg.Canvas.pen.Color:=clyellow;
        aimg.Canvas.pen.Width:=1;
        aimg.Canvas.MoveTo(KoordX[j][i],KoordY[j][i]-FNeuronWidth*3+FNeuronWidth*3);
        aimg.Canvas.LineTo(KoordX[j][i],KoordY[j][i]-FNeuronWidth+FNeuronWidth*4);
        aimg.Canvas.moveTo(KoordX[j][i],KoordY[j][i]-FNeuronWidth+FNeuronWidth*4); // ok sað ucu
        aimg.Canvas.LineTo(KoordX[j][i]+FNeuronWidth,KoordY[j][i]-FNeuronWidth*2+FNeuronWidth*4);
        aimg.Canvas.moveTo(KoordX[j][i],KoordY[j][i]-FNeuronWidth+FNeuronWidth*4); // ok sol ucu
        aimg.Canvas.LineTo(KoordX[j][i]-FNeuronWidth,KoordY[j][i]-FNeuronWidth*2+FNeuronWidth*4);  //}
   end;
End;

Procedure DrawNetwork;
Begin
   with aimg do begin
     Canvas.Brush.Color:=RGB(58,110,165); //clWhite; //RGB(58,110,165);
     Canvas.Brush.Style:=bsSolid;
     Canvas.FillRect(ClientRect);
     RefreshNetworkImage;
   end;
End;

procedure CloseClick(Sender: TObject; var action: TCloseAction);
begin
   //if MessageDlg('Wanna Leave?',mtConfirmation,[mbYes, mbNo],0)= mrYes then begin
   //for i:= 1 to QB+1 do bArr[i].Free;
   //ProcessmessagesON;
   action:= caFree;
   writeln('NN Form Free and destroy finished');
 //  TForm1_Destroy(self)
 end;
 
procedure CloseClick2(Sender: TObject; var action: TCloseAction);
begin
   //if MessageDlg('Wanna Leave?',mtConfirmation,[mbYes, mbNo],0)= mrYes then begin
   //for i:= 1 to QB+1 do bArr[i].Free;
   //ProcessmessagesON;
   action:= caFree;
   writeln('NN GUI Form2 Free and destroy finished');
 //  TForm1_Destroy(self)
 end;

//var Form1: TForm;
procedure loaddrawform;
begin
 Form1:= TForm.create(self);
 with form1 do begin
  setBounds(118, 185, 1154, 648);
  Caption:= 'NeuralnetworkTree Graph Version 2.1 mX4 '+
                       ' RMS ERROR:'+Format('%10.5f',[{nn1.}FRMSError]);
  icon.loadfromresourcename(hinstance, 'XPASCALCOIN');
  Color:= clBtnFace
  onclose:= @CloseClick;
  //ClientRect.Top:= 12;
  show
  aimg:= TImage.create(form1);
  with aimg  do begin
    parent:= form1;
    align:= alclient;
  end;  
 end
end;  

//var Form1: TForm;
procedure loadGUIform;
begin
 Form2:= TForm.create(self);
 with form2 do begin
  setBounds(198, 105, 860, 486);
  Caption:= 'NeuralnetworkTree Graph Version 2.2 EU mX4 XOR Sample'+
                       ' RMS ERROR:'+Format('%10.5f',[{nn1.}FRMSError]);
  icon.loadfromresourcename(hinstance, 'XPASCALCOIN');
  Color:= clBtnFace
  onclose:= @CloseClick2;
  //ClientRect.Top:= 12;
  //Left = 198
  //Top = 104
  //Caption = 'XORSample'
  //ClientHeight = 466
  //ClientWidth = 760
  Font.Charset := DEFAULT_CHARSET
  Font.Color := clSilver
  Font.Height := -11
  Font.Name := 'MS Sans Serif'
  Font.Style := []
  OldCreateOrder := False
  OnCreate := @FormCreate2;
  PixelsPerInch := 96
  //TextHeight = 13
  show
  Label1:= TLabel.create(form2)
  with label1 do begin
   parent:= form2;
    Left := 533
    Top:= 64
    Width:= 58
    Height:= 20
    Caption:= 'Input 1'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlue
    Font.Height:= -16
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
  end;
  Label2:= TLabel.create(form2)
  with label2 do begin
   parent:= form2;
    Left:= 533
    Top:= 88
    Width:= 58
    Height:= 20
    Caption:= 'Input 2'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlue
    Font.Height:= -16
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
  end ;
  RMSImage:= TImage.create(form1);
  with RMSImage  do begin
    parent:= form2;
    setbounds(253, 258, 478, 188);
    //align:= alclient;
  end; 
   Label3:= TLabel.create(form2)
  with label2 do begin
   parent:= form2;
    Left:= 295
    Top:= 1
    Width:= 99
    Height:= 20
    Caption:= 'Neuron Size'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlue
    Font.Height:= -16
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
  end;
  Label5:= TLabel.create(form2)
  with label5 do begin
   parent:= form2;
    Left:= 485
    Top:= 234
    Width:= 90
    Height:= 20
    Caption:= 'RMS Error:'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlue
    Font.Height:= -16
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
  end;
  Label6:= TLabel.create(form2)
  with label6 do begin
   parent:= form2;
    Left:= 485
    Top:= 212
    Width:= 158
    Height:= 20
    Caption:= 'Number of Training:'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlue
    Font.Height:= -16
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
  end ;
  Label7:= TLabel.create(form2)
  with label7 do begin
   parent:= form2;
    Left:= 340
    Top:= 156
    Width:= 312
    Height:= 40
    Caption:= 
      'Inputs and Outputs Use '#39'5'#39's as minimum, and '#39'10'#39's as maximum val' +
      'ues'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlue
    Font.Height:= 16;
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
    WordWrap:= True
  end;
  LearnBtn:= TBitBtn.create(form2)
  with learnbtn do begin
   parent:= form2
    Left:= 251
    Top:= 24
    Width:= 100
    Height:= 25
    Caption:= 'Learn'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= 8404992
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
    TabOrder:= 0
    OnClick:= @LearnBtnClick;
  end;
  Input1:= TEdit.create(form1)
  with input1 do begin
   parent:= form2;
    Left:= 594
    Top:= 64
    Width:= 66
    Height:= 24
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlack
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
    //F//ont.Style:= [fsBold]
    //ParentFont:= False
    TabOrder:= 1
    Text:= '0'
  end;
  Input2:= TEdit.create(form1)
  with input2 do begin
   parent:= form2;
    Left:= 594
    Top:= 88
    Width:= 66
    Height:= 24
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlack
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
   // Font.Style:= [fsBold]
    ParentFont:= False
    TabOrder:= 2
    Text:= '0'
  end;
  Output1:= TEdit.create(form2)
  with output1 do begin
   parent:= form2
    Left:= 595
    Top:= 112
    Width:= 65
    Height:= 24
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlack
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
    TabOrder:= 3
  end ;
  //object RMSedit: TEdit
  RMSedit:= TEdit.create(form2)
  with RMSedit do begin
   parent:= form2
    Left:= 575
    Top:= 234
    Width:= 155
    Height:= 21
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clRed
    Font.Height:= -11
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
    ReadOnly:= True
    TabOrder:= 4
    Text:= 'not available yet'
  end ;
  SpinEdit1:= TSpinEdit.create(form2)
  with spinedit1 do begin
   parent:= form2;
    Left:= 395
    Top:= 0
    Width:= 57
    Height:= 22
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clBlack
    Font.Height:= -11
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    MaxValue:= 15
    MinValue:= 1
    ParentFont:= False
    TabOrder:= 5
    Value:= 3
    OnChange:= @SpinEdit1Change;
  end ;
  Panel1:= TPanel.create(form2)
  with panel1 do begin
   parent:= form2;
    Left:= 0
    Top:= 0
    Width:= 249
    Height:= 466
    Align:= alLeft
    TabOrder:= 6
    MessageBox:= TMemo.create(form2)
    with messagebox do begin
     parent:= panel1;
      Left:= 1
      Top:= 41
      Width:= 247
      Height:= 424
      Align:= alClient
      Font.Charset:= DEFAULT_CHARSET
      Font.Color:= clBlack
      Font.Height:= -11
      Font.Name:= 'MS Sans Serif'
      Font.Style:= []
      ParentFont:= False
      TabOrder:= 0
    end;
    Panel2:= TPanel.create(form2)
    with panel2 do begin
     parent:= panel1;
      Left:= 1
      Top:= 1
      Width:= 247
      Height:= 40
      Align:= alTop
      TabOrder:= 1
      Label4:= TLabel.create(form2)
      with label4 do begin
       parent:= panel2
        Left:= 75
        Top:= 9
        Width:= 82
        Height:= 20
        Caption:= 'Messages'
        Font.Charset:= DEFAULT_CHARSET
        Font.Color:= 10485760
        Font.Height:= -16
        Font.Name:= 'MS Sans Serif'
        //Font.Style:= [fsBold]
        ParentFont:= False
      end ;
    end ;
  end;
  DrawNetBtn:= TBitBtn.create(form2)
  with drawnetbtn do begin
   parent:= form2;
    Left:= 663
    Top:= 0
    Width:= 100
    Height:= 25
    Caption:= 'Draw Network'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= 8404992
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
    TabOrder:= 7
    OnClick:= @DrawNetBtnClick;
  end;
  CalculateBtn:= TBitBtn.create(form2)
  with calculatebtn do begin
   parent:= form2
    Left:= 457
    Top:= 112
    Width:= 137
    Height:= 25
    Caption:= 'Calculate Output'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= 8404992
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
   // Font.Style:= [fsBold]
    ParentFont:= False
    TabOrder:= 8
    OnClick:= @CalculateBtnClick;
  end ;
  SaveNetBtn:= TBitBtn.create(form2)
  with savenetbtn do begin
   parent:= form2
    Left:= 558
    Top:= 0
    Width:= 105
    Height:= 25
    Caption:= 'Save Network'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clNavy
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    //ParentFont:= False
    TabOrder:= 9
    OnClick:= @SaveNetBtnClick ;
  end;
  loadNetBtn:= TBitBtn.create(form2)
  with loadnetbtn do begin
   parent:= form2
    Left:= 453
    Top:= 0
    Width:= 105
    Height:= 25
    Caption:= 'Load Network'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clNavy
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
    TabOrder:= 10
    OnClick:= @LoadNetBtnClick
  end ;
  Button1:= TButton.create(form2)
  with button1 do begin
   parent:= form2
    Left:= 668
    Top:= 64
    Width:= 94
    Height:= 72
    Caption:= 'Close Form'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clSilver
    Font.Height:= -11
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
    TabOrder:= 11
    OnClick:= @Button1Click
  end;
  StopLearnBtn:= TBitBtn.create(form2)
  with stoplearnbtn do begin
   parent:= form2;
    Left:= 349
    Top:= 24
    Width:= 104
    Height:= 25
    Caption:= 'Stop Learning'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clNavy
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
    TabOrder:= 12
    OnClick:= @StopLearnBtnClick;
  end;
  TrainTimesEdt:= TEdit.create(form2)
  with traintimesedt do begin
   parent:= form2;
    Left:= 648
    Top:= 212
    Width:= 82
    Height:= 21
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clRed
    Font.Height:= -11
    Font.Name:= 'MS Sans Serif'
  //  Font.Style:= [fsBold]
    ParentFont:= False
    ReadOnly:= True
    TabOrder:= 13
    Text:= 'not available yet'
  end ;
  SaveNetBmpBtn:= TBitBtn.create(form2)
  with SaveNetBmpBtn do begin
   parent:= form2; 
    Left:= 452
    Top:= 24
    Width:= 311
    Height:= 25
    Caption:= 'Save Network Image as Bitmap'
    Font.Charset:= DEFAULT_CHARSET
    Font.Color:= clNavy
    Font.Height:= -13
    Font.Name:= 'MS Sans Serif'
    //Font.Style:= [fsBold]
    ParentFont:= False
    TabOrder:= 14
    OnClick:= @SaveNetBmpBtnClick
  end;
  OpenDialog1:= TOpenDialog.create(form2)
  with opendialog1 do begin
    Filter:= 'Network Files|*.Net'
    Left:= 432
    Top:= 64
  end ;
  SaveDialog1:= TSaveDialog.create(form2)
  with savedialog1 do begin
    DefaultExt:= 'net'
    Filter:= 'Network Files|*.Net'
    //Options:= [ofOverwritePrompt, ofHideReadOnly, ofEnableSizing]
    Left:= 464
    Top:= 64
  end; 
 end; //form2
  FormCreate2(self);
end;  

Procedure SetInputMinimums(const InputMinimums : array of double);
var i : integer;
Begin
  for i:=0 to High(Neurons[0]) do
           MinimumInputs[i]:=InputMinimums[i];
end;

Procedure SetAllInputRange(Minimum,Maximum:double);
var i:integer;
begin
  for i:=0 to High(Neurons[0]) do begin
        MinimumInputs[i]:=Minimum;
        MaximumInputs[i]:=Maximum;
  end;
end;

Procedure SetAllOutputRange(Minimum,Maximum:double);
var i : integer;
Begin
  for i:=0 to High(Desired) do begin
      MinimumOutputs[i]:=Minimum;
      MaximumOutputs[i]:=Maximum;
  end;
end;

Procedure SetOutputMaximums(const OutputMaximums : array of double);
var i : integer;
Begin
  for i:=0 to High(Desired) do
        MaximumOutputs[i]:=OutputMaximums[i];
end;

Procedure SetOutputMinimums(const OutputMinimums : array of double);
var i : integer;
Begin
    for i:=0 to High(Desired) do
          MinimumOutputs[i]:=OutputMinimums[i];
end;

Procedure SetInputMaximums(const InputMaximums : array of double);
var i : integer;
Begin
    for i:=0 to High(Neurons[0]) do
          MaximumInputs[i]:=InputMaximums[i];
end;

procedure SetExpectedOutputs(const Outputs: array of double);
var i:integer; OKIDOK:boolean;
begin
  OKIDOK:=false;
  for i:=0 to High(Desired) do
     if MinimumOutputs[i]<>MaximumOutputs[i] then OKIDOK:=true;
  if OKIDOK then
   for i:=0 to High(Desired) do
    Desired[i]:=ScaledValue(Outputs[i],MinimumOutputs[i],MaximumOutputs[i])
  else for i:=0 to High(Desired) do
    Desired[i]:=Outputs[i];
end;

procedure SetInputs(const Inputs: array of double);
var i : integer; OKIDOK:boolean;
begin
  OKIDOK:=false;
  //writeln('debug len check '+itoa(length(MinimumInputs)));
  //writeln('debug len check '+itoa(length(MaximumOutputs)));
  for i:=0 to High(Neurons[0])-1 do  // fix -1  !
      if (MinimumInputs[i]<>MaximumOutputs[i]) then OKIDOK:=true;
  if OKIDOK then
    for i:=0 to High(Neurons[0]) do
       Neurons[0][i]:=ScaledValue(Inputs[i],MinimumInputs[i],MaximumInputs[i])
    else for i:=0 to High(Neurons[0]) do
        Neurons[0][i]:=Inputs[i]
end;

procedure GetOutputs(Var Outputs: array of double);
Var i:integer;  hin: integer;
begin
  hin:= high(neurons);
  for i:=0 to FOutputNumber-1 do
        Outputs[i]:=Neurons[hin][i];
  for i:=0 to FOutputNumber-1 do
        Outputs[i]:=Outputs[i]*(MaximumOutputs[i]-MinimumOutputs[i])+MinimumOutputs[i];
end;

procedure GetOutputsFromInputs(const Inputs:array of double; var Outputs:array of double);
var i:integer;
begin
  SetInputs(Inputs);
  ForwardProcessing;
  for i:=0 to FOutputNumber-1 do
      Outputs[i]:=Neurons[high(Neurons)][i];
end;

//unit xorsampleu; and form

procedure LearnBtnClick(Sender: TObject);
var
   mininputs:array [0..1] of double;
   maxinputs:array [0..1] of double;
   minoutputs:array [0..0] of double;
   maxoutputs:array [0..0] of double;
   
   input:array[0..1] of double;
   //Output,Desired:array[0..0] of double;
   Output,Desired:array of double;
   i,j,k:integer;
   a,b:byte;
begin
LearnBtn.Enabled:=false;
StopLearnBtn.Enabled:=true;

 SetLength(Output,1); 
 SetLength(desired,1); 

if not {nn2.}fInitialized then begin{nn1.I}initialize(true);
   writ('debug inf: initialize');
   writ('debug initialized '+botostr(finitialized));
 end;

 CreateNetwork2(self);

mininputs[0]:=5; mininputs[1]:=5; maxinputs[0]:=10; maxinputs[1]:=10;
SetInputMinimums(mininputs); SetInputMaximums(maxinputs);

{ easier way for setting minimum and maximum input values
NN1.SetAllInputRange(0,1);}

//minoutputs[0]:=0; maxoutputs[0]:=1;
//nn1.SetOutputMinimums(minoutputs); nn1.SetOutputMaximums(maxoutputs);
// easier way for setting minimum and maximum output values
SetAllOutputRange(5,10);

j:=1;
MessageBox.Lines.Add('Started at '+datetimetostr(now));

aContinue:=true;
while ({nn1.}FRMSError*5000>1) or aContinue do begin
    if not aContinue then exit;

RMSImage.Canvas.Brush.Color:=RGB(58,110,165);
RMSImage.Canvas.Brush.Style:=bsSolid;
RMSImage.Canvas.FillRect(form2.ClientRect);
RMSImage.Canvas.pen.Color:=clRed;
RMSImage.Canvas.TextRect(RMSImage.ClientRect,RMSImage.ClientWidth div
                                   3,RMSImage.ClientHeight-12,'Iteration');
RMSImage.Canvas.TextOut(5,0,'RMS Error');
RMSImage.Canvas.MoveTo(10,10);
RMSImage.Canvas.lineTo(10,RMSImage.ClientHeight-10);
RMSImage.Canvas.MoveTo(10,RMSImage.ClientHeight-10);
RMSImage.Canvas.lineTo(RMSImage.ClientWidth-10,RMSImage.ClientHeight-10);
RMSImage.Canvas.MoveTo(10,RMSImage.ClientHeight-10);

for i:=1 to RMSImage.ClientWidth-20 do begin
RMSEdit.text:=Format('%20.15f',[FRMSError]);
TrainTimesEdt.Text:=IntToStr(FNumberOfTraining);
RMSImage.Canvas.pen.Color:=clWhite;
RMSImage.Canvas.lineto(i+10,RMSImage.ClientHeight-10-round(frmserror*100));
Case j of
1: begin
input[0]:=5; input[1]:=5;
Desired[0]:=5;
end;
2: begin
input[0]:=10; input[1]:=10;
Desired[0]:=5;
end;
3: begin
input[0]:=10; input[1]:=5;
Desired[0]:=10;
end;
4: begin
input[0]:=5; input[1]:=10;
Desired[0]:=10;
end;
end; //Case

if j<=4 then j:=j+1 else j:=1;

application.ProcessMessages;

SetInputs(input);
SetExpectedOutputs(Desired);
Train;
GetOutputs(Output);
end;
end; //while
MessageBox.Lines.Add('Finished at '+datetimetostr(now));
end;


procedure SpinEdit1Change(Sender: TObject);
begin
  FNeuronWidth:=SpinEdit1.Value
end;

procedure DrawNetBtnClick(Sender: TObject);
begin
  DrawNetwork;
end;

procedure CalculateBtnClick(Sender: TObject);
var
input:array[0..1] of double;
Output:array of double;
begin
SetLength(Output,1); 
input[0]:=StrToFloat(Input1.text);
input[1]:=StrToFloat(Input2.text);
writ('debug initialized '+botostr(finitialized));
finitialized:= true;
writ('debug initialized '+botostr(finitialized));
if fInitialized then begin
   SetInputs(input);
   Recall;
   GetOutputs(Output);
   Output1.Text:=FloatToStr(Output[0]);
end else showmessage('Network is not initialized.')
end;

procedure SaveNetBtnClick(Sender: TObject);
begin
if SaveDialog1.Execute then
if {nn1.}SaveNetwork(SaveDialog1.FileName) then
showmessage('Saved Successfully');
end;

procedure LoadNetBtnClick(Sender: TObject);
begin
if OpenDialog1.Execute then
if {nn1.}LoadNetwork(OpenDialog1.FileName) then
showmessage(' Loaded Successfully');
end;

procedure Button1Click(Sender: TObject);
begin
  form2.close
end;

procedure StopLearnBtnClick(Sender: TObject);
begin
StopLearnBtn.Enabled:=false;
LearnBtn.Enabled:=true;
aContinue:=false;
MessageBox.Lines.Add('Finished learn at '+datetimetostr(now));
end;

procedure FormCreate2(Sender: TObject);
begin
  StopLearnBtn.Enabled:=false;
end;

procedure SaveNetBmpBtnClick(Sender: TObject);
begin
{nn1.}DrawNetwork;
  aimg.Picture.SaveToFile(exepath+'xor2network.bmp');
end;


var i,j, iterators:integer;
    NN1:TNeuralNetwork;
    Inputs,Outputs:array of double;


begin //@main

   createNetwork(self);
   iterators:= 1500;   //150000
   SetLength(Inputs,2); SetLength(Outputs,1); //Set array for inputs and outputs
   
  {NN1.}nNetwork.Clear; // Clear network structure
    nNetwork.Add('2'); // Number of inputs
    nNetwork.Add('4'); // Number of hidden neurons
    //nNetwork.Add('3'); // Number of hidden neurons
    nNetwork.Add('1'); // Number of outputs
    Initialize(true); // Initialize neural network
   {NN1.}SetAllInputRange(0,1); SetAllOutputRange(0,1);
  
  processmessagesOFF;
   writeln('train neural network start..:'+itoa(iterators)+' iterators ');  
 for i:=1 to iterators do //train network for 150000 iterations
  begin
    Inputs[0]:=random(2); Inputs[1]:=random(2); //Specify inputs
    {NN1.}SetInputs(Inputs); //Set inputs specified above
    Outputs[0]:=Round(Inputs[0]) xor round(Inputs[1]);
    {NN1.}SetExpectedOutputs(Outputs); //Set expected outputs
    {NN1.}Train; //Train
  end;
   writeln('train neural network finished:');
   processmessagesON;  
  
  writeln('RMS ERROR:'+Format('%20.15f',[{nn1.}FRMSError]));
  // Querying network
  writeln('evaluate neural network..');
  for i:=0 to 1 do
    for j:=0 to 1 do begin
      Inputs[0]:=i; Inputs[1]:=j; //Specify inputs
      {NN1.}GetOutputsFromInputs(inputs,Outputs); //Obtain outputs from network
      writeln('i:'+IntToStr(i)+' j:'+IntToStr(j)+Format('%20.15f',[Outputs[0]]));
    end;
  loaddrawform
  DrawNetwork(); 
  //aimg.picture.savetofile(exepath+'examples\1234_neuralnetgraph.bmp');
  //destroyNetwork();  
  loadGUIform();
  //destroyNetwork();  
  
  //oPENWEB('https://raw.githack.com/breitsch2/maXbox4/master/assets/text2jstester.html')
 end.
end.

ref: http://www.softwareschule.ch/examples/neuralnetwork2.txt
RMS ERROR:   0.000548003484465
//15000
i:0 j:0   0.037869802448942
i:0 j:1   0.966986423235839
i:1 j:0   0.971077640105349
i:1 j:1   0.008661361371759
 mX4 executed: 18/07/2023 21:30:56  Runtime: 0:0:6.420  Memload: 56% use
 
RMS ERROR:   0.000070713668184
//15000
evaluate neural network..
i:0 j:0   0.011878797582992
i:0 j:1   0.974239811246186
i:1 j:0   0.978344524047223
i:1 j:1   0.025932108096062
 mX4 executed: 18/07/2023 21:35:11  Runtime: 0:0:5.357  Memload: 57% use
 
train neural network finished:
RMS ERROR:   0.000510621737779
evaluate neural network..
i:0 j:0   0.044512254301975
i:0 j:1   0.968422941488127
i:1 j:0   0.968073948178052
i:1 j:1   0.007621985588518
 mX4 executed: 18/07/2023 21:42:02  Runtime: 0:0:7.484  Memload: 56% use
train neural network start..:15000 iterators 
train neural network finished:
RMS ERROR:   0.000787632198274
evaluate neural network..
i:0 j:0   0.043969287157934
i:0 j:1   0.978207384040024
i:1 j:0   0.960416461147976
i:1 j:1   0.005429182872161
 mX4 executed: 18/07/2023 21:55:06  Runtime: 0:0:5.704  Memload: 55% use
train neural network finished:
RMS ERROR:   0.000023487221961 
//150000
evaluate neural network..
i:0 j:0   0.000069973794392
i:0 j:1   0.993102057958661
i:1 j:0   0.993146501806906
i:1 j:1   0.008038882760312
 mX4 executed: 18/07/2023 21:38:07  Runtime: 0:0:59.497  Memload: 56% use
